import fs from 'fs';
import { PMTiles } from 'pmtiles';

async function inspect() {
  try {
    const buffer = fs.readFileSync('public/hexagon-ast-v441.pmtiles');
    
    const source = {
      getKey: () => "hexagon-ast-v441",
      getBytes: async (offset, length) => {
        const slice = buffer.slice(offset, offset + length);
        return {
          data: slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength)
        };
      }
    };
    
    const p = new PMTiles(source);
    const metadata = await p.getMetadata();
    console.log("Vector Layers:", JSON.stringify(metadata.vector_layers, null, 2));
  } catch (err) {
    console.error("Error inspecting PMTiles:", err);
  }
}

inspect();
