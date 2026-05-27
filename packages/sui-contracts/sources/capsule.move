module capsule_protocol::capsule;

use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;

const EInvalidRoot: u64 = 0;
const EEmptyBlobId: u64 = 1;
const EInvalidRange: u64 = 2;
const EUnauthorized: u64 = 3;
const EInvalidPayment: u64 = 4;
const EWrongPurchase: u64 = 5;
const EPurchaseConsumed: u64 = 6;
const EInvalidPrice: u64 = 7;
const EInvalidLineCount: u64 = 8;
const EWrongFragment: u64 = 9;

/// A public commitment to an encrypted source stored as a Walrus blob.
public struct Document has key, store {
    id: UID,
    root_hash: vector<u8>,
    walrus_blob_id: vector<u8>,
    owner: address,
    line_count: u64,
    price_per_line_mist: u64,
    timestamp_ms: u64,
}

/// A paid authorization for one line-range disclosure. This remains shared
/// so that the publisher can consume it while producing the purchased capsule.
public struct Purchase has key, store {
    id: UID,
    document_id: ID,
    fragment_id: Option<ID>,
    buyer: address,
    line_start: u64,
    line_end: u64,
    amount_mist: u64,
    consumed: bool,
    timestamp_ms: u64,
}

/// A publisher-encrypted fixed section that can be sold without server plaintext access.
public struct Fragment has key, store {
    id: UID,
    document_id: ID,
    seal_identity: vector<u8>,
    line_start: u64,
    line_end: u64,
    walrus_blob_id: vector<u8>,
}

/// The on-chain pointer to a permanent selective-disclosure capsule.
public struct Disclosure has key, store {
    id: UID,
    document_id: ID,
    purchase_id: ID,
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
    purchase_id: ID,
    disclosure_id: ID,
    buyer: address,
    line_start: u64,
    line_end: u64,
}

public struct RangePurchased has copy, drop {
    document_id: ID,
    purchase_id: ID,
    buyer: address,
    line_start: u64,
    line_end: u64,
    amount_mist: u64,
}

public struct FragmentRegistered has copy, drop {
    document_id: ID,
    fragment_id: ID,
    line_start: u64,
    line_end: u64,
}

/// Creates a shared commitment: data is fetched from Walrus, but validated
/// against this immutable Merkle root.
public entry fun register_document(
    root_hash: vector<u8>,
    walrus_blob_id: vector<u8>,
    line_count: u64,
    price_per_line_mist: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(root_hash.length() == 32, EInvalidRoot);
    assert!(!walrus_blob_id.is_empty(), EEmptyBlobId);
    assert!(line_count > 0, EInvalidLineCount);
    assert!(price_per_line_mist > 0, EInvalidPrice);

    let owner = ctx.sender();
    let document = Document {
        id: object::new(ctx),
        root_hash,
        walrus_blob_id,
        owner,
        line_count,
        price_per_line_mist,
        timestamp_ms: clock.timestamp_ms(),
    };
    let document_id = object::id(&document);
    event::emit(DocumentRegistered { document_id, owner });
    transfer::share_object(document);
}

/// Publishes one fixed, already Seal-encrypted sellable fragment.
public entry fun register_fragment(
    document: &Document,
    seal_identity: vector<u8>,
    line_start: u64,
    line_end: u64,
    walrus_blob_id: vector<u8>,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == document.owner, EUnauthorized);
    assert!(line_start <= line_end && line_end < document.line_count, EInvalidRange);
    assert!(!seal_identity.is_empty() && !walrus_blob_id.is_empty(), EEmptyBlobId);

    let document_id = object::id(document);
    let fragment = Fragment {
        id: object::new(ctx),
        document_id,
        seal_identity,
        line_start,
        line_end,
        walrus_blob_id,
    };
    let fragment_id = object::id(&fragment);
    event::emit(FragmentRegistered { document_id, fragment_id, line_start, line_end });
    transfer::share_object(fragment);
}

/// Pays the publisher and publishes a one-use proof that authorizes release of
/// precisely this range. The payment object must contain the exact sale price.
public entry fun purchase_range(
    document: &Document,
    line_start: u64,
    line_end: u64,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(line_start <= line_end && line_end < document.line_count, EInvalidRange);
    let amount_mist = (line_end - line_start + 1) * document.price_per_line_mist;
    assert!(coin::value(&payment) == amount_mist, EInvalidPayment);

    let document_id = object::id(document);
    let buyer = ctx.sender();
    let purchase = Purchase {
        id: object::new(ctx),
        document_id,
        fragment_id: option::none(),
        buyer,
        line_start,
        line_end,
        amount_mist,
        consumed: false,
        timestamp_ms: clock.timestamp_ms(),
    };
    let purchase_id = object::id(&purchase);
    transfer::public_transfer(payment, document.owner);
    event::emit(RangePurchased {
        document_id,
        purchase_id,
        buyer,
        line_start,
        line_end,
        amount_mist,
    });
    transfer::share_object(purchase);
}

/// Pays for a fixed publisher-encrypted fragment and records its exact range.
public entry fun purchase_fragment(
    document: &Document,
    fragment: &Fragment,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let document_id = object::id(document);
    assert!(fragment.document_id == document_id, EWrongFragment);
    let fragment_id = object::id(fragment);
    let amount_mist = (fragment.line_end - fragment.line_start + 1) * document.price_per_line_mist;
    assert!(coin::value(&payment) == amount_mist, EInvalidPayment);

    let buyer = ctx.sender();
    let purchase = Purchase {
        id: object::new(ctx),
        document_id,
        fragment_id: option::some(fragment_id),
        buyer,
        line_start: fragment.line_start,
        line_end: fragment.line_end,
        amount_mist,
        consumed: false,
        timestamp_ms: clock.timestamp_ms(),
    };
    let purchase_id = object::id(&purchase);
    transfer::public_transfer(payment, document.owner);
    event::emit(RangePurchased {
        document_id,
        purchase_id,
        buyer,
        line_start: fragment.line_start,
        line_end: fragment.line_end,
        amount_mist,
    });
    transfer::share_object(purchase);
}

/// The publisher consumes a paid purchase after uploading its capsule to
/// Walrus. The resulting provenance object belongs to the buyer.
public entry fun record_disclosure(
    document: &Document,
    purchase: &mut Purchase,
    walrus_capsule_blob: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == document.owner, EUnauthorized);
    assert!(!walrus_capsule_blob.is_empty(), EEmptyBlobId);

    let document_id = object::id(document);
    assert!(purchase.document_id == document_id, EWrongPurchase);
    assert!(!purchase.consumed, EPurchaseConsumed);
    purchase.consumed = true;

    let purchase_id = object::id(purchase);
    let buyer = purchase.buyer;
    let line_start = purchase.line_start;
    let line_end = purchase.line_end;
    let disclosure = Disclosure {
        id: object::new(ctx),
        document_id,
        purchase_id,
        buyer,
        line_start,
        line_end,
        walrus_capsule_blob,
        timestamp_ms: clock.timestamp_ms(),
    };
    let disclosure_id = object::id(&disclosure);
    event::emit(DisclosureRecorded {
        document_id,
        purchase_id,
        disclosure_id,
        buyer,
        line_start,
        line_end,
    });
    transfer::transfer(disclosure, buyer);
}

/// Records provenance for a pre-encrypted fixed fragment without reading its plaintext.
public entry fun record_fragment_disclosure(
    document: &Document,
    fragment: &Fragment,
    purchase: &mut Purchase,
    walrus_capsule_blob: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == document.owner, EUnauthorized);
    assert!(!walrus_capsule_blob.is_empty(), EEmptyBlobId);
    let document_id = object::id(document);
    assert!(fragment.document_id == document_id && purchase.document_id == document_id, EWrongFragment);
    assert!(purchase.fragment_id == option::some(object::id(fragment)), EWrongFragment);
    assert!(
        purchase.line_start == fragment.line_start && purchase.line_end == fragment.line_end,
        EWrongFragment,
    );
    assert!(!purchase.consumed, EPurchaseConsumed);
    purchase.consumed = true;

    let purchase_id = object::id(purchase);
    let buyer = purchase.buyer;
    let line_start = purchase.line_start;
    let line_end = purchase.line_end;
    let disclosure = Disclosure {
        id: object::new(ctx),
        document_id,
        purchase_id,
        buyer,
        line_start,
        line_end,
        walrus_capsule_blob,
        timestamp_ms: clock.timestamp_ms(),
    };
    let disclosure_id = object::id(&disclosure);
    event::emit(DisclosureRecorded {
        document_id,
        purchase_id,
        disclosure_id,
        buyer,
        line_start,
        line_end,
    });
    transfer::transfer(disclosure, buyer);
}

/// Seal authorization for a paid capsule encrypted under its Purchase ID.
/// This is deliberately read-only so the buyer can retrieve the capsule again.
entry fun seal_approve(
    id: vector<u8>,
    purchase: &Purchase,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == purchase.buyer, EUnauthorized);
    assert!(id == object::id(purchase).to_bytes(), EWrongPurchase);
}

/// Seal authorization for a pre-encrypted fragment after a matching purchase.
entry fun seal_approve_fragment(
    id: vector<u8>,
    document: &Document,
    fragment: &Fragment,
    purchase: &Purchase,
    ctx: &TxContext,
) {
    let document_id = object::id(document);
    assert!(ctx.sender() == purchase.buyer, EUnauthorized);
    assert!(fragment.document_id == document_id && purchase.document_id == document_id, EWrongFragment);
    assert!(purchase.fragment_id == option::some(object::id(fragment)), EWrongFragment);
    assert!(
        purchase.line_start == fragment.line_start && purchase.line_end == fragment.line_end,
        EWrongFragment,
    );
    assert!(id == fragment.seal_identity, EWrongFragment);
}

public fun root_hash(document: &Document): &vector<u8> {
    &document.root_hash
}

public fun walrus_blob_id(document: &Document): &vector<u8> {
    &document.walrus_blob_id
}

public fun purchase_consumed(purchase: &Purchase): bool {
    purchase.consumed
}

public fun purchase_buyer(purchase: &Purchase): address {
    purchase.buyer
}

public fun purchase_document_id(purchase: &Purchase): ID {
    purchase.document_id
}

public fun purchase_bounds(purchase: &Purchase): (u64, u64) {
    (purchase.line_start, purchase.line_end)
}

public fun disclosure_blob_id(disclosure: &Disclosure): &vector<u8> {
    &disclosure.walrus_capsule_blob
}
