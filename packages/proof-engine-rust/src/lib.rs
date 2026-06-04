use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use wasm_bindgen::prelude::*;

type Hash = [u8; 32];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LineRange {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProofNode {
    pub hash: String,
    pub position: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LineProof {
    pub line_index: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub leaf_salt: Option<String>,
    pub siblings: Vec<ProofNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MerkleRangeProof {
    pub algorithm: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub leaf_hashing: Option<String>,
    pub leaf_count: usize,
    pub padded_leaf_count: usize,
    pub range: LineRange,
    pub proofs: Vec<LineProof>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TreeResult {
    pub root_hash: String,
    pub leaf_count: usize,
    pub padded_leaf_count: usize,
}

fn hash_bytes(bytes: &[u8]) -> Hash {
    Sha256::digest(bytes).into()
}

fn hash_pair(left: &Hash, right: &Hash) -> Hash {
    let mut bytes = Vec::with_capacity(64);
    bytes.extend_from_slice(left);
    bytes.extend_from_slice(right);
    hash_bytes(&bytes)
}

fn line_hash(line: &str) -> Hash {
    hash_bytes(line.as_bytes())
}

fn index_bytes(index: usize) -> [u8; 8] {
    (index as u64).to_be_bytes()
}

fn salted_line_hash(line: &str, index: usize, salt: &str) -> Result<Hash, String> {
    let salt_bytes = hex::decode(salt).map_err(|_| "invalid leaf salt".to_string())?;
    if salt_bytes.len() != 32 {
        return Err("invalid leaf salt".into());
    }
    let mut bytes = Vec::with_capacity("capsule:salted-leaf:v1".len() + 8 + 32 + line.len());
    bytes.extend_from_slice(b"capsule:salted-leaf:v1");
    bytes.extend_from_slice(&index_bytes(index));
    bytes.extend_from_slice(&salt_bytes);
    bytes.extend_from_slice(line.as_bytes());
    Ok(hash_bytes(&bytes))
}

fn padding_line_hash(index: usize) -> Hash {
    let mut bytes = Vec::with_capacity("capsule:padding-leaf:v1".len() + 8);
    bytes.extend_from_slice(b"capsule:padding-leaf:v1");
    bytes.extend_from_slice(&index_bytes(index));
    hash_bytes(&bytes)
}

fn normalized_lines(lines: &[String]) -> Vec<String> {
    if lines.is_empty() {
        vec![String::new()]
    } else {
        lines.to_vec()
    }
}

fn levels_with_salts(lines: &[String], salts: Option<&[String]>) -> Result<Vec<Vec<Hash>>, String> {
    let values = normalized_lines(lines);
    let leaf_count = values.len();
    let padded_count = leaf_count.next_power_of_two();
    if let Some(salts) = salts {
        if salts.len() != leaf_count {
            return Err("leaf salt count must match document line count".into());
        }
    }
    let mut leaves: Vec<Hash> = values
        .iter()
        .enumerate()
        .map(|(index, line)| match salts {
            Some(salts) => salted_line_hash(line, index, &salts[index]),
            None => Ok(line_hash(line)),
        })
        .collect::<Result<_, _>>()?;
    while leaves.len() < padded_count {
        leaves.push(match salts {
            Some(_) => padding_line_hash(leaves.len()),
            None => line_hash(""),
        });
    }

    let mut tree = vec![leaves];
    while tree.last().expect("leaves exist").len() > 1 {
        let level = tree.last().expect("level exists");
        let parent: Vec<Hash> = level
            .chunks_exact(2)
            .map(|pair| hash_pair(&pair[0], &pair[1]))
            .collect();
        tree.push(parent);
    }
    Ok(tree)
}

fn levels(lines: &[String]) -> Vec<Vec<Hash>> {
    levels_with_salts(lines, None).expect("plain hashing cannot fail")
}

pub fn build_tree(lines: &[String]) -> TreeResult {
    let values = normalized_lines(lines);
    let tree = levels(&values);
    TreeResult {
        root_hash: hex::encode(tree.last().expect("root level")[0]),
        leaf_count: values.len(),
        padded_leaf_count: tree[0].len(),
    }
}

pub fn build_tree_with_salts(lines: &[String], salts: &[String]) -> Result<TreeResult, String> {
    let values = normalized_lines(lines);
    let tree = levels_with_salts(&values, Some(salts))?;
    Ok(TreeResult {
        root_hash: hex::encode(tree.last().expect("root level")[0]),
        leaf_count: values.len(),
        padded_leaf_count: tree[0].len(),
    })
}

pub fn generate_proof(
    lines: &[String],
    start: usize,
    end: usize,
) -> Result<MerkleRangeProof, String> {
    let values = normalized_lines(lines);
    if start > end || end >= values.len() {
        return Err("requested disclosure range is outside the document".into());
    }
    let tree = levels(&values);
    let mut proofs = Vec::new();
    for line_index in start..=end {
        let mut cursor = line_index;
        let mut siblings = Vec::new();
        for level in tree.iter().take(tree.len() - 1) {
            let is_right = cursor % 2 == 1;
            let sibling_index = if is_right { cursor - 1 } else { cursor + 1 };
            siblings.push(ProofNode {
                hash: hex::encode(level[sibling_index]),
                position: if is_right { "left" } else { "right" }.into(),
            });
            cursor /= 2;
        }
        proofs.push(LineProof {
            line_index,
            leaf_salt: None,
            siblings,
        });
    }
    Ok(MerkleRangeProof {
        algorithm: "sha256".into(),
        leaf_hashing: Some("plain-sha256".into()),
        leaf_count: values.len(),
        padded_leaf_count: tree[0].len(),
        range: LineRange { start, end },
        proofs,
    })
}

pub fn generate_proof_with_salts(
    lines: &[String],
    salts: &[String],
    start: usize,
    end: usize,
) -> Result<MerkleRangeProof, String> {
    let values = normalized_lines(lines);
    if start > end || end >= values.len() {
        return Err("requested disclosure range is outside the document".into());
    }
    let tree = levels_with_salts(&values, Some(salts))?;
    let mut proofs = Vec::new();
    for line_index in start..=end {
        let mut cursor = line_index;
        let mut siblings = Vec::new();
        for level in tree.iter().take(tree.len() - 1) {
            let is_right = cursor % 2 == 1;
            let sibling_index = if is_right { cursor - 1 } else { cursor + 1 };
            siblings.push(ProofNode {
                hash: hex::encode(level[sibling_index]),
                position: if is_right { "left" } else { "right" }.into(),
            });
            cursor /= 2;
        }
        proofs.push(LineProof {
            line_index,
            leaf_salt: Some(salts[line_index].clone()),
            siblings,
        });
    }
    Ok(MerkleRangeProof {
        algorithm: "sha256".into(),
        leaf_hashing: Some("salted-sha256-v1".into()),
        leaf_count: values.len(),
        padded_leaf_count: tree[0].len(),
        range: LineRange { start, end },
        proofs,
    })
}

pub fn verify_proof(lines: &[String], proof: &MerkleRangeProof, expected_root: &str) -> bool {
    if proof.algorithm != "sha256"
        || proof.range.start > proof.range.end
        || lines.len() != proof.range.end - proof.range.start + 1
        || proof.proofs.len() != lines.len()
    {
        return false;
    }

    lines
        .iter()
        .zip(&proof.proofs)
        .enumerate()
        .all(|(offset, (line, line_proof))| {
            if line_proof.line_index != proof.range.start + offset {
                return false;
            }
            let mut current = match proof.leaf_hashing.as_deref() {
                Some("salted-sha256-v1") => match line_proof
                    .leaf_salt
                    .as_deref()
                    .ok_or_else(|| "missing salt".to_string())
                    .and_then(|salt| salted_line_hash(line, line_proof.line_index, salt))
                {
                    Ok(hash) => hash,
                    Err(_) => return false,
                },
                Some("plain-sha256") | None => line_hash(line),
                Some(_) => return false,
            };
            for node in &line_proof.siblings {
                let sibling = match hex::decode(&node.hash)
                    .ok()
                    .and_then(|bytes| bytes.try_into().ok())
                {
                    Some(hash) => hash,
                    None => return false,
                };
                current = match node.position.as_str() {
                    "left" => hash_pair(&sibling, &current),
                    "right" => hash_pair(&current, &sibling),
                    _ => return false,
                };
            }
            hex::encode(current) == expected_root
        })
}

fn parse_lines(lines_json: &str) -> Result<Vec<String>, JsValue> {
    serde_json::from_str(lines_json).map_err(|error| JsValue::from_str(&error.to_string()))
}

#[wasm_bindgen(js_name = buildMerkleTree)]
pub fn build_merkle_tree(lines_json: &str) -> Result<String, JsValue> {
    serde_json::to_string(&build_tree(&parse_lines(lines_json)?))
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

#[wasm_bindgen(js_name = generateRangeProof)]
pub fn generate_range_proof(lines_json: &str, start: usize, end: usize) -> Result<String, JsValue> {
    let proof =
        generate_proof(&parse_lines(lines_json)?, start, end).map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&proof).map_err(|error| JsValue::from_str(&error.to_string()))
}

#[wasm_bindgen(js_name = buildSaltedMerkleTree)]
pub fn build_salted_merkle_tree(lines_json: &str, salts_json: &str) -> Result<String, JsValue> {
    let tree = build_tree_with_salts(&parse_lines(lines_json)?, &parse_lines(salts_json)?)
        .map_err(|error| JsValue::from_str(&error))?;
    serde_json::to_string(&tree).map_err(|error| JsValue::from_str(&error.to_string()))
}

#[wasm_bindgen(js_name = generateSaltedRangeProof)]
pub fn generate_salted_range_proof(
    lines_json: &str,
    salts_json: &str,
    start: usize,
    end: usize,
) -> Result<String, JsValue> {
    let proof = generate_proof_with_salts(&parse_lines(lines_json)?, &parse_lines(salts_json)?, start, end)
        .map_err(|error| JsValue::from_str(&error))?;
    serde_json::to_string(&proof).map_err(|error| JsValue::from_str(&error.to_string()))
}

#[wasm_bindgen(js_name = verifyRangeProof)]
pub fn verify_range_proof(
    disclosed_lines_json: &str,
    proof_json: &str,
    expected_root: &str,
) -> Result<bool, JsValue> {
    let lines = parse_lines(disclosed_lines_json)?;
    let proof: MerkleRangeProof =
        serde_json::from_str(proof_json).map_err(|error| JsValue::from_str(&error.to_string()))?;
    Ok(verify_proof(&lines, &proof, expected_root))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> Vec<String> {
        ["alpha", "beta", "gamma", "delta", "epsilon"]
            .map(String::from)
            .to_vec()
    }

    #[test]
    fn pads_non_power_of_two_documents() {
        let tree = build_tree(&fixture());
        assert_eq!(tree.leaf_count, 5);
        assert_eq!(tree.padded_leaf_count, 8);
        assert_eq!(tree.root_hash.len(), 64);
    }

    #[test]
    fn verifies_a_selected_range_and_rejects_modified_content() {
        let lines = fixture();
        let proof = generate_proof(&lines, 1, 3).unwrap();
        let root = build_tree(&lines).root_hash;
        assert!(verify_proof(&lines[1..=3], &proof, &root));

        let altered = ["beta", "tampered", "delta"].map(String::from).to_vec();
        assert!(!verify_proof(&altered, &proof, &root));
    }

    #[test]
    fn is_deterministic_for_empty_documents() {
        let tree = build_tree(&[]);
        assert_eq!(tree.leaf_count, 1);
        assert_eq!(tree.padded_leaf_count, 1);
        assert_eq!(
            tree.root_hash,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn verifies_salted_commitments_and_requires_disclosed_salts() {
        let lines = fixture();
        let salts = (0..lines.len())
            .map(|index| format!("{index:064x}"))
            .collect::<Vec<_>>();
        let root = build_tree_with_salts(&lines, &salts).unwrap().root_hash;
        let plain_root = build_tree(&lines).root_hash;
        assert_ne!(root, plain_root);

        let proof = generate_proof_with_salts(&lines, &salts, 1, 2).unwrap();
        assert_eq!(proof.leaf_hashing.as_deref(), Some("salted-sha256-v1"));
        assert!(verify_proof(&lines[1..=2], &proof, &root));

        let mut missing_salt = proof.clone();
        missing_salt.proofs[0].leaf_salt = None;
        assert!(!verify_proof(&lines[1..=2], &missing_salt, &root));
    }
}
