#!/usr/bin/env python3
"""
Script to clear all items from all ClubHub DynamoDB tables
"""
import boto3
from botocore.exceptions import ClientError

# Initialize DynamoDB resource with region
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# List of all ClubHub tables
TABLES = [
    'ClubHub-Users',
    'ClubHub-Groups',
    'ClubHub-GroupMembers',
    'ClubHub-Events',
    'ClubHub-Payments',
    'ClubHub-Messages',
    'ClubHub-Photos'
]

def clear_table(table_name):
    """Clear all items from a DynamoDB table"""
    try:
        table = dynamodb.Table(table_name)

        # Get table key schema to know what keys to use for deletion
        key_schema = table.key_schema
        key_names = [key['AttributeName'] for key in key_schema]

        print(f"\nClearing table: {table_name}")
        print(f"Key schema: {key_names}")

        # Scan the table and delete all items
        scan_kwargs = {}
        deleted_count = 0

        while True:
            response = table.scan(**scan_kwargs)
            items = response.get('Items', [])

            if not items:
                break

            # Delete items in batch
            with table.batch_writer() as batch:
                for item in items:
                    # Extract only the key attributes
                    key = {k: item[k] for k in key_names}
                    batch.delete_item(Key=key)
                    deleted_count += 1

            print(f"  Deleted {deleted_count} items so far...")

            # Check if there are more items to scan
            if 'LastEvaluatedKey' not in response:
                break
            scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']

        print(f"✓ Cleared {deleted_count} items from {table_name}")
        return deleted_count

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'ResourceNotFoundException':
            print(f"✗ Table {table_name} does not exist")
        else:
            print(f"✗ Error clearing {table_name}: {e}")
        return 0
    except Exception as e:
        print(f"✗ Unexpected error clearing {table_name}: {e}")
        return 0

def main():
    print("=" * 60)
    print("ClubHub Database Clear Script")
    print("=" * 60)
    print("\nThis will delete ALL data from ALL tables!")
    print(f"\nTables to clear: {', '.join(TABLES)}")

    total_deleted = 0

    for table_name in TABLES:
        deleted = clear_table(table_name)
        total_deleted += deleted

    print("\n" + "=" * 60)
    print(f"Database cleared! Total items deleted: {total_deleted}")
    print("=" * 60)

if __name__ == "__main__":
    main()
