module capsule_protocol::capsule;

use sui::clock::Clock;
use sui::event;

const EInvalidRoot: u64 = 0;
const EEmptyBlobId: u64 = 1;
const EInvalidRange: u64 = 2;
const EUnauthorized: u64 = 3;

/// A public commitment to an encrypted source stored as a Walrus blob.
public struct Document has key, store {
    id: UID,
    root_hash: vector<u8>,
    walrus_blob_id: vector<u8>,
    owner: address,
    timestamp_ms: u64,
}

/// The on-chain pointer to a permanent selective-disclosure capsule.
public struct Disclosure has key, store {
    id: UID,
    document_id: ID,
    buyer: address,
    line_start: u64,
    line_end: u64,
    walrus_capsule_blob: vector<u8>,
    timestamp_ms: u64,
}

public struct DocumentRegistered has copy, drop {
    document_id: ID,
    owner: address,
}

public struct DisclosureRecorded has copy, drop {
    document_id: ID,
    disclosure_id: ID,
    buyer: address,
    line_start: u64,
    line_end: u64,
}

/// Creates a shared commitment: data is fetched from Walrus, but validated
/// against this immutable Merkle root.
public entry fun register_document(
    root_hash: vector<u8>,
    walrus_blob_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(root_hash.length() == 32, EInvalidRoot);
    assert!(!walrus_blob_id.is_empty(), EEmptyBlobId);

    let owner = ctx.sender();
    let document = Document {
        id: object::new(ctx),
        root_hash,
        walrus_blob_id,
        owner,
        timestamp_ms: clock.timestamp_ms(),
    };
    let document_id = object::id(&document);
    event::emit(DocumentRegistered { document_id, owner });
    transfer::share_object(document);
}

/// The publisher records an authorized sale after uploading its capsule to
/// Walrus. The resulting provenance object belongs to the buyer.
public entry fun record_disclosure(
    document: &Document,
    buyer: address,
    line_start: u64,
    line_end: u64,
    walrus_capsule_blob: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == document.owner, EUnauthorized);
    assert!(line_start <= line_end, EInvalidRange);
    assert!(!walrus_capsule_blob.is_empty(), EEmptyBlobId);

    let document_id = object::id(document);
    let disclosure = Disclosure {
        id: object::new(ctx),
        document_id,
        buyer,
        line_start,
        line_end,
        walrus_capsule_blob,
        timestamp_ms: clock.timestamp_ms(),
    };
    let disclosure_id = object::id(&disclosure);
    event::emit(DisclosureRecorded {
        document_id,
        disclosure_id,
        buyer,
        line_start,
        line_end,
    });
    transfer::transfer(disclosure, buyer);
}

public fun root_hash(document: &Document): &vector<u8> {
    &document.root_hash
}

public fun walrus_blob_id(document: &Document): &vector<u8> {
    &document.walrus_blob_id
}

public fun disclosure_blob_id(disclosure: &Disclosure): &vector<u8> {
    &disclosure.walrus_capsule_blob
}

