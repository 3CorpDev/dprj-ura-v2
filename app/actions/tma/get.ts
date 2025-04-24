'use server'

import mysql from 'mysql2/promise';

// Interface for the TMA data
interface TMAData {
  extension: string;
  tma: number;
  last_updated: Date;
}

// Function to get TMA data for a specific extension
export async function getTMA(extension: string): Promise<TMAData | null> {
  // Create connection pool
  const pool = mysql.createPool({
    host: process.env.MARIADB_HOST || '10.253.10.33',
    user: process.env.MARIADB_USER || 'root',
    password: process.env.MARIADB_PASSWORD || '@Implantacao!2023',
    database: process.env.MARIADB_DATABASE || 'asterisk',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // Get connection from pool
    const connection = await pool.getConnection();

    try {
      // Query to get TMA data for the extension
      const [rows] = await connection.execute(
        'select AVG(duration) from cdr where source = ? and calldate like ?;',
        [extension, new Date().toISOString().slice(0, 10) + '%']
      );

      // If no data found, return null
      if (!Array.isArray(rows) || rows.length === 0) {
        return null;
      }

      // Return the first matching record
      const tmaData = rows[0] as any;
      return {
        extension: tmaData.extension,
        tma: tmaData.tma,
        last_updated: new Date(tmaData.last_updated)
      };

    } finally {
      // Always release the connection back to the pool
      connection.release();
    }

  } catch (error) {
    console.error('[getTMA] Error fetching TMA data:', error);
    throw new Error('Failed to fetch TMA data');
  } finally {
    // Close the pool
    await pool.end();
  }
}
