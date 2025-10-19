import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import yaml from 'yaml';

/**
 * GET /api/openapi
 *
 * Serve the OpenAPI specification in JSON format
 */
export async function GET() {
  try {
    // Read the YAML file
    const openapiPath = join(process.cwd(), 'openapi.yaml');
    const fileContents = await readFile(openapiPath, 'utf8');

    // Parse YAML to JSON
    const openapiSpec = yaml.parse(fileContents);

    // Return as JSON
    return NextResponse.json(openapiSpec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error loading OpenAPI spec:', error);
    return NextResponse.json(
      { error: 'Failed to load API specification' },
      { status: 500 }
    );
  }
}
