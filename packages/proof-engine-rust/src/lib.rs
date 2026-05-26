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
    pub siblings: Vec<ProofNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MerkleRangeProof {
    pub algorithm: String,
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

fn normalized_lines(lines: &[String]) -> Vec<String> {
    if lines.is_empty() {
        vec![String::new()]
    } else {
        lines.to_vec()
    }
}

fn levels(lines: &[String]) -> Vec<Vec<Hash>> {
    let values = normalized_lines(lines);
    let leaf_count = values.len();
    let padded_count = leaf_count.next_power_of_two();
    let mut leaves: Vec<Hash> = values.iter().map(|line| line_hash(line)).collect();
    leaves.resize(padded_count, line_hash(""));

    let mut tree = vec![leaves];
    while tree.last().expect("leaves exist").len() > 1 {
        let level = tree.last().expect("level exists");
        let parent: Vec<Hash> = level
            .chunks_exact(2)
            .map(|pair| hash_pair(&pair[0], &pair[1]))
            .collect();
        tree.push(parent);
    }
    tree
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
            siblings,
        });
    }
    Ok(MerkleRangeProof {
        algorithm: "sha256".into(),
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
            let mut current = line_hash(line);
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
pub fn generate_range_proof(
    lines_json: &str,
    start: usize,
    end: usize,
) -> Result<String, JsValue> {
    let proof =
        generate_proof(&parse_lines(lines_json)?, start, end).map_err(|e| JsValue::from_str(&e))?;
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
}

