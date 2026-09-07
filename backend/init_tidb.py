#!/usr/bin/env python3
"""
TiDB Database & Table Initialization Script for Postcards & Little Footnotes.

Connects to your TiDB cluster using credentials in .env,
creates the database (if not exists), and sets up the trips and moments tables.
"""

import sys
from pathlib import Path
import pymysql

# Load environment configuration
from config import Config


def init_tidb():
    print("=" * 60)
    print("Postcards & Little Footnotes — TiDB Database & Schema Initializer")
    print("=" * 60)

    print(f"\n[1/4] Connecting to TiDB cluster...")
    print(f"      Host:     {Config.TIDB_HOST}")
    print(f"      Port:     {Config.TIDB_PORT}")
    print(f"      User:     {Config.TIDB_USER}")
    print(f"      Database: {Config.TIDB_DATABASE}")
    print(f"      SSL CA:   {Config.TIDB_SSL_CA if Config.TIDB_SSL_CA else 'Default SSL'}")

    ssl_dict = {}
    if Config.TIDB_SSL_CA:
        ssl_dict = {"ca": Config.TIDB_SSL_CA}

    try:
        # Step 1: Connect to TiDB server (without selecting database yet)
        conn = pymysql.connect(
            host=Config.TIDB_HOST,
            port=Config.TIDB_PORT,
            user=Config.TIDB_USER,
            password=Config.TIDB_PASSWORD,
            connect_timeout=Config.TIDB_CONNECT_TIMEOUT,
            ssl=ssl_dict if ssl_dict else None,
            autocommit=True,
            charset="utf8mb4",
        )
        print("      Connection established successfully!")

    except pymysql.Error as e:
        print(f"\n[ERROR] Failed to connect to TiDB cluster: {e}")
        print("\nPlease check:")
        print("1. Your TIDB_HOST, TIDB_PORT, TIDB_USER, and TIDB_PASSWORD in backend/.env")
        print("2. That your IP is allowed/whitelisted in your TiDB Cloud cluster settings.")
        print("3. That SSL certificates are valid if TIDB_SSL_CA is specified.")
        sys.exit(1)

    try:
        with conn.cursor() as cur:
            # Step 2: Create Database
            print(f"\n[2/4] Ensuring database `{Config.TIDB_DATABASE}` exists...")
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{Config.TIDB_DATABASE}`;")
            cur.execute(f"USE `{Config.TIDB_DATABASE}`;")
            print(f"      Database `{Config.TIDB_DATABASE}` is ready.")

            # Step 3: Create Tables
            print("\n[3/4] Creating tables...")

            # trips table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS trips (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                start_date DATE NULL,
                end_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            print("      - Table `trips` created/verified.")

            # moments table
            cur.execute("""
            CREATE TABLE IF NOT EXISTS moments (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                trip_id BIGINT NOT NULL,
                caption TEXT NULL,
                photo_key VARCHAR(500) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                latitude DECIMAL(10, 7) NULL,
                longitude DECIMAL(10, 7) NULL,
                FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
            );
            """)
            print("      - Table `moments` created/verified.")

            # Check for legacy column migration if applicable
            cur.execute("""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'moments' AND COLUMN_NAME = 'photo_path';
            """, (Config.TIDB_DATABASE,))
            if cur.fetchone():
                try:
                    cur.execute("ALTER TABLE moments CHANGE photo_path photo_key VARCHAR(500) NULL;")
                    print("      - Migrated column `photo_path` -> `photo_key` in `moments` table.")
                except Exception as mig_err:
                    print(f"      - Column migration notice: {mig_err}")

            # Step 4: Verification
            print("\n[4/4] Verifying schema...")
            cur.execute("SHOW TABLES;")
            tables = [row[0] for row in cur.fetchall()]
            print(f"      Tables in `{Config.TIDB_DATABASE}`: {', '.join(tables)}")

        print("\n" + "=" * 60)
        print("TiDB database initialization completed successfully!")
        print("=" * 60)

    except pymysql.Error as e:
        print(f"\n[ERROR] An error occurred while setting up the schema: {e}")
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    init_tidb()
