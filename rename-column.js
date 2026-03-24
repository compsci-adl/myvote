import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://myvote-uofa-csc-dev.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQzMTg2NzksImlkIjoiNWNmZmI4ODYtZDA3NS00Y2Q0LWJjODEtZjkyMmY5NjVkOTUyIiwicmlkIjoiMzkyMzFmMmQtYTRiMy00YjNmLWFlNTYtMjEzYTMzNjRkYjZjIn0.T2zAjpwRNArZMRIbI_X4p63AwLf4IrPPsAlCIsyZyN5AMO0QinE0kIshsjWoDGiVJ6h2500RrrivgBdEJyTlBQ'
});

const db = drizzle(client);

async function checkSchema() {
  try {
    console.log('Checking position table schema...');
    const result = await client.execute('PRAGMA table_info(position);');
    console.log('Position table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.name}: ${row.type}`);
    });
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    client.close();
  }
}

checkSchema();