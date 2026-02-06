#!/usr/bin/env python3
"""
Convert Anchor v0.30+ IDL to legacy format for anchorpy compatibility.

The new Anchor IDL format (v0.30+) is not compatible with anchorpy's parser.
This script converts the new format to the legacy format.

Usage:
    python convert_idl.py input.json output.json
"""
import json
import sys
from pathlib import Path


def convert_account(account: dict) -> dict:
    """Convert a single account from new format to legacy format."""
    legacy = {
        "name": to_camel_case(account["name"]),
        "isMut": account.get("writable", False),
        "isSigner": account.get("signer", False),
    }

    # Handle optional flag
    if account.get("optional"):
        legacy["isOptional"] = True

    return legacy


def convert_arg(arg: dict) -> dict:
    """Convert an instruction argument from new format to legacy format."""
    return {
        "name": to_camel_case(arg["name"]),
        "type": convert_type(arg["type"]),
    }


def convert_type(type_def) -> any:
    """Convert a type definition from new format to legacy format."""
    if isinstance(type_def, str):
        # Simple types
        type_mapping = {
            "bool": "bool",
            "u8": "u8",
            "u16": "u16",
            "u32": "u32",
            "u64": "u64",
            "u128": "u128",
            "i8": "i8",
            "i16": "i16",
            "i32": "i32",
            "i64": "i64",
            "i128": "i128",
            "f32": "f32",
            "f64": "f64",
            "string": "string",
            "pubkey": "publicKey",
            "bytes": "bytes",
        }
        return type_mapping.get(type_def, type_def)

    if isinstance(type_def, dict):
        # Complex types
        if "vec" in type_def:
            return {"vec": convert_type(type_def["vec"])}
        if "option" in type_def:
            return {"option": convert_type(type_def["option"])}
        if "array" in type_def:
            inner_type, size = type_def["array"]
            return {"array": [convert_type(inner_type), size]}
        if "defined" in type_def:
            return {"defined": type_def["defined"]["name"]}

    return type_def


def convert_instruction(instruction: dict) -> dict:
    """Convert an instruction from new format to legacy format."""
    return {
        "name": to_camel_case(instruction["name"]),
        "accounts": [convert_account(acc) for acc in instruction.get("accounts", [])],
        "args": [convert_arg(arg) for arg in instruction.get("args", [])],
    }


def convert_account_type(account: dict, types_lookup: dict) -> dict:
    """Convert an account type definition from new format to legacy format.

    In Anchor 0.30+ IDL:
    - accounts only have name and discriminator
    - type definitions are in the separate "types" section

    For legacy format, we need to inline the type definition into the account.
    """
    name = account["name"]

    # Check if account already has type (some IDLs)
    type_def = account.get("type", {})
    if type_def and type_def.get("kind") == "struct":
        fields = []
        for field in type_def.get("fields", []):
            fields.append({
                "name": to_camel_case(field["name"]),
                "type": convert_type(field["type"]),
            })
        return {
            "name": name,
            "type": {
                "kind": "struct",
                "fields": fields,
            },
        }

    # Look up type definition from types section
    if name in types_lookup:
        type_def = types_lookup[name]
        if type_def.get("kind") == "struct":
            fields = []
            for field in type_def.get("fields", []):
                fields.append({
                    "name": to_camel_case(field["name"]),
                    "type": convert_type(field["type"]),
                })
            return {
                "name": name,
                "type": {
                    "kind": "struct",
                    "fields": fields,
                },
            }

    # Fallback: return basic account structure
    return {
        "name": name,
        "type": {
            "kind": "struct",
            "fields": [],
        },
    }


def convert_type_def(type_def: dict) -> dict:
    """Convert a type definition (enum, struct) from new format to legacy format."""
    name = type_def["name"]
    inner_type = type_def.get("type", {})

    if inner_type.get("kind") == "enum":
        variants = []
        for variant in inner_type.get("variants", []):
            legacy_variant = {"name": variant["name"]}
            if "fields" in variant:
                # Named fields
                if isinstance(variant["fields"], list) and len(variant["fields"]) > 0:
                    if isinstance(variant["fields"][0], dict) and "name" in variant["fields"][0]:
                        legacy_variant["fields"] = [
                            {"name": f["name"], "type": convert_type(f["type"])}
                            for f in variant["fields"]
                        ]
                    else:
                        # Tuple fields
                        legacy_variant["fields"] = [convert_type(f) for f in variant["fields"]]
            variants.append(legacy_variant)

        return {
            "name": name,
            "type": {
                "kind": "enum",
                "variants": variants,
            },
        }

    if inner_type.get("kind") == "struct":
        fields = []
        for field in inner_type.get("fields", []):
            fields.append({
                "name": to_camel_case(field["name"]),
                "type": convert_type(field["type"]),
            })
        return {
            "name": name,
            "type": {
                "kind": "struct",
                "fields": fields,
            },
        }

    return type_def


def to_camel_case(snake_str: str) -> str:
    """Convert snake_case to camelCase."""
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def convert_idl(new_idl: dict) -> dict:
    """Convert an entire IDL from new format to legacy format."""
    # Extract program ID from new format
    address = new_idl.get("address", "")
    metadata = new_idl.get("metadata", {})

    legacy_idl = {
        "version": metadata.get("version", "0.1.0"),
        "name": metadata.get("name", "unknown"),
        "instructions": [],
        "accounts": [],
        "types": [],
        "errors": [],
        "metadata": {
            "address": address,
        },
    }

    # Build types lookup for account conversion
    # In Anchor 0.30+ IDL, accounts only have name/discriminator
    # Type definitions are in the "types" section
    types_lookup = {}
    for type_def in new_idl.get("types", []):
        types_lookup[type_def["name"]] = type_def.get("type", {})

    # Convert instructions
    for instruction in new_idl.get("instructions", []):
        legacy_idl["instructions"].append(convert_instruction(instruction))

    # Convert accounts (need types lookup to inline type definitions)
    for account in new_idl.get("accounts", []):
        legacy_idl["accounts"].append(convert_account_type(account, types_lookup))

    # Convert types (only non-account types, or all for reference)
    for type_def in new_idl.get("types", []):
        legacy_idl["types"].append(convert_type_def(type_def))

    # Convert errors
    for error in new_idl.get("errors", []):
        legacy_idl["errors"].append({
            "code": error.get("code", 0),
            "name": error.get("name", ""),
            "msg": error.get("msg", ""),
        })

    return legacy_idl


def main():
    if len(sys.argv) < 3:
        print("Usage: python convert_idl.py <input.json> <output.json>")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    print(f"Converting {input_path} -> {output_path}")

    with open(input_path) as f:
        new_idl = json.load(f)

    legacy_idl = convert_idl(new_idl)

    with open(output_path, 'w') as f:
        json.dump(legacy_idl, f, indent=2)

    print(f"Converted IDL with {len(legacy_idl['instructions'])} instructions")
    print(f"Instructions: {[i['name'] for i in legacy_idl['instructions']]}")


if __name__ == "__main__":
    main()
