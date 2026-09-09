import logging
from typing import Any, Dict, List, Optional, Tuple, Union
from flask import g
import pymysql
from pymysql.cursors import DictCursor

from config import Config

logger = logging.getLogger(__name__)


class DatabaseError(Exception):
    """Custom exception raised when a database operation fails."""

    def __init__(self, message: str = "Database service is currently unavailable. Please try again later.", status_code: int = 503):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def get_db():
    """
    Get or create a TiDB database connection for the current request context.
    Re-uses active connection or reconnects if ping fails.
    """
    if "db" not in g:
        ssl_dict = {}
        if Config.TIDB_SSL_CA:
            ssl_dict = {"ca": Config.TIDB_SSL_CA}

        try:
            conn = pymysql.connect(
                host=Config.TIDB_HOST,
                port=Config.TIDB_PORT,
                user=Config.TIDB_USER,
                password=Config.TIDB_PASSWORD,
                database=Config.TIDB_DATABASE,
                connect_timeout=Config.TIDB_CONNECT_TIMEOUT,
                ssl=ssl_dict if ssl_dict else None,
                cursorclass=DictCursor,
                autocommit=True,
                charset="utf8mb4",
            )
            g.db = conn
        except pymysql.Error as e:
            logger.error(f"TiDB connection error (host={Config.TIDB_HOST}:{Config.TIDB_PORT}): {e}")
            raise DatabaseError("Database service is currently unavailable. Please check connection.") from e

    else:
        # Check if existing connection is alive
        try:
            g.db.ping(reconnect=True)
        except pymysql.Error as e:
            logger.warning(f"TiDB connection ping failed, attempting reconnect: {e}")
            try:
                ssl_dict = {"ca": Config.TIDB_SSL_CA} if Config.TIDB_SSL_CA else None
                g.db = pymysql.connect(
                    host=Config.TIDB_HOST,
                    port=Config.TIDB_PORT,
                    user=Config.TIDB_USER,
                    password=Config.TIDB_PASSWORD,
                    database=Config.TIDB_DATABASE,
                    connect_timeout=Config.TIDB_CONNECT_TIMEOUT,
                    ssl=ssl_dict,
                    cursorclass=DictCursor,
                    autocommit=True,
                    charset="utf8mb4",
                )
            except pymysql.Error as re_err:
                logger.error(f"TiDB reconnection failed: {re_err}")
                raise DatabaseError("Database service is currently unavailable.") from re_err

    return g.db


def close_db(e=None):
    """Close connection at the end of the request."""
    db = g.pop("db", None)
    if db is not None:
        try:
            db.close()
        except Exception as err:
            logger.debug(f"Error closing TiDB connection: {err}")


def query_db(
    query: str, params: Union[Tuple, List] = (), one: bool = False
) -> Union[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    """Execute a SELECT query against TiDB with parameterized values."""
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(query, params)
            results = cur.fetchall()

        if one:
            return results[0] if results else None
        return results
    except pymysql.Error as e:
        logger.error(f"TiDB query failed: {query} with params {params} - Error: {e}")
        raise DatabaseError("A database query error occurred.") from e


def execute_db(query: str, params: Union[Tuple, List] = ()) -> int:
    """Execute an INSERT/UPDATE/DELETE query against TiDB and return last inserted id."""
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(query, params)
            last_id = cur.lastrowid
            return last_id or 0
    except pymysql.Error as e:
        logger.error(f"TiDB execution failed: {query} with params {params} - Error: {e}")
        raise DatabaseError("A database execution error occurred.") from e


def init_db(app=None) -> bool:
    """
    Initialize TiDB schema (database and tables) on startup.
    Handles errors gracefully so the application server starts even if TiDB is warming up.
    """
    ssl_dict = {}
    if Config.TIDB_SSL_CA:
        ssl_dict = {"ca": Config.TIDB_SSL_CA}

    try:
        # Initial connection to create database if not present
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
        try:
            with conn.cursor() as cur:
                cur.execute(f"CREATE DATABASE IF NOT EXISTS `{Config.TIDB_DATABASE}`;")
                cur.execute(f"USE `{Config.TIDB_DATABASE}`;")
                
                # users table
                cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    username VARCHAR(100) NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """)

                # trips table
                cur.execute("""
                CREATE TABLE IF NOT EXISTS trips (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    user_id BIGINT NULL,
                    name VARCHAR(255) NOT NULL,
                    start_date DATE NULL,
                    end_date DATE NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                """)

                # Check for user_id column in trips
                cur.execute("""
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'trips' AND COLUMN_NAME = 'user_id';
                """, (Config.TIDB_DATABASE,))
                if not cur.fetchone():
                    try:
                        cur.execute("ALTER TABLE trips ADD COLUMN user_id BIGINT NULL;")
                    except Exception:
                        pass

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

                # Automatic migration if photo_path exists instead of photo_key
                cur.execute("""
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'moments' AND COLUMN_NAME = 'photo_path';
                """, (Config.TIDB_DATABASE,))
                if cur.fetchone():
                    try:
                        cur.execute("ALTER TABLE moments CHANGE photo_path photo_key VARCHAR(500) NULL;")
                    except Exception:
                        pass

                logger.info("Successfully connected to TiDB and verified schema.")
                return True
        finally:
            conn.close()
    except Exception as e:
        logger.warning(f"Could not initialize TiDB schema at startup ({Config.TIDB_HOST}:{Config.TIDB_PORT}): {e}. Will retry on incoming requests.")
        return False
