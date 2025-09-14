import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add API Key
const api_Key = '';
const headers = { Authorization: `Bearer ${api_Key}` };

// Folder to save FBX files
const saveFolder = path.join(__dirname, 'fbx-downloads-format');
if (!fs.existsSync(saveFolder)) fs.mkdirSync(saveFolder);

// Load products.json file to get images
const filePath = path.join(__dirname, '../data-scraper/products.json');
const productsJsonData = fs.readFileSync(filePath, 'utf-8');
const products = JSON.parse(productsJsonData);

// Flatten all images into an array
const allImages = products.flatMap(p => p.images || []);
console.log(`Found ${allImages.length} images to process:`, allImages);

// Helper function to download files
async function downloadFile(url, savePath) {
  const response = await axios.get(url, { responseType: 'stream' });
  const writer = fs.createWriteStream(savePath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Process individual image to 3D model
async function processImage(imageUrl, index) {
  const payload = {
    image_url: imageUrl,
    target_polycount: 2500,
    enable_pbr: false,
    should_remesh: true,
    should_texture: true
  };

  try {
    // Step 1: Create the 3D task
    console.log(`Creating 3D task for image ${index + 1}: ${imageUrl}`);
    const createResponse = await axios.post(
      'https://api.meshy.ai/openapi/v1/image-to-3d',
      payload,
      { headers }
    );
    const taskId = createResponse.data.result;
    console.log(`Task created with ID: ${taskId}`);

    // Step 2: Wait 4 minutes for processing
    console.log("Waiting 4 minutes for Meshy AI to process...");
    await new Promise(r => setTimeout(r, 240000)); 

    // Step 3: Fetch the result
    console.log("Fetching processed result...");
    const resultResponse = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );

    const fbxUrl = resultResponse.data.model_urls?.fbx || resultResponse.data.model_url;
    if (!fbxUrl) {
      console.error(`No FBX URL found for task ${taskId}`);
      return;
    }

    // Step 4: Download the FBX file
    const fileName = `obj${index + 1}.fbx`;
    const savePath = path.join(saveFolder, fileName);
    console.log(`Downloading FBX to ${savePath}...`);
    await downloadFile(fbxUrl, savePath);
    console.log(`✅ Download completed for ${fileName}!`);

  } catch (error) {
    console.error(`❌ Error processing image ${index + 1}: ${imageUrl}`);
    console.error(error.response?.data || error.message);
  }
}

// Main function to process all images
async function main() {
  console.log(`Starting to process ${allImages.length} images...`);
  
  for (let i = 0; i < allImages.length; i++) {
    console.log(`\n--- Processing image ${i + 1}/${allImages.length} ---`);
    await processImage(allImages[i], i);
  }
  
  console.log("\n🎉 All images processed!");
}

// Run the main function
main().catch(console.error);