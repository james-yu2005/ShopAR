import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replace with your actual API key
const headers = { Authorization: `msy_LCuho4qevejyHt1aRnEjKZFTDDbKV0CHVaGi` };

// Folder to save FBX files
const saveFolder = path.join(__dirname, 'fbx_downloads');
if (!fs.existsSync(saveFolder)) fs.mkdirSync(saveFolder);

// Load products.json file

const products = JSON.parse(jsonData);

// Helper function to extract link from description
const extractLink = (description) => {
  const match = description.match(/Link:\s*(\S+)/);
  return match ? match[1] : "";
};

// Flatten all images into an array
const allImages = products.flatMap(p => p.images || []);

console.log(allImages)
// // Helper function to download a file
// async function downloadFile(url, outputPath) {
//   const writer = fs.createWriteStream(outputPath);
//   const response = await axios.get(url, { responseType: 'stream' });
//   response.data.pipe(writer);

//   return new Promise((resolve, reject) => {
//     writer.on('finish', resolve);
//     writer.on('error', reject);
//   });
// }

// // Create separate JSON for each product
// products.forEach((product, index) => {
//   const objName = `obj${index + 1}`;
//   const jsonData = {
//     price: product.price,
//     link: extractLink(product.description),
//     scale: 37.5,
//     images: product.images || []
//   };
//   const jsonPath = path.join(saveFolder, `${objName}.json`);
//   fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
//   console.log(`Saved ${objName}.json`);
// });

// // Array of images to process
// const images = [
//   "https://cdn.shopify.com/s/files/1/0951/4414/9298/files/Screenshot2025-09-13170242.png?v=1757797370",
//   "https://cdn.shopify.com/s/files/1/0951/4414/9298/files/Screenshot2025-09-13165146.png?v=1757796709",
//   "https://cdn.shopify.com/s/files/1/0951/4414/9298/files/Screenshot2025-09-13170501.png?v=1757798079",
//   "https://cdn.shopify.com/s/files/1/0951/4414/9298/files/Screenshot2025-09-13180815.png?v=1757801298",
//   "https://cdn.shopify.com/s/files/1/0951/4414/9298/files/Screenshot2025-09-13180627.png?v=1757801192",
//   "https://cdn.shopify.com/s/files/1/0951/4414/9298/files/Screenshot2025-09-13174731.png?v=1757800134",
//   "https://cdn.shopify.com/s/files/1/0951/4414/9298/files/Screenshot2025-09-13175611.png?v=1757800572",
//   "https://cdn.shopify.com/s/files/1/0951/4414/9298/files/Screenshot2025-09-13200556.png?v=1757808438",
//   "https://cdn.shopify.com/s/files/1/0951/4414/9298/files/MFG_26700-406.jpg?v=1757813290"
// ]

// // Helper function to download a file
// async function downloadFile(url, outputPath) {
//   const writer = fs.createWriteStream(outputPath);
//   const response = await axios.get(url, { responseType: 'stream' });

//   response.data.pipe(writer);

//   return new Promise((resolve, reject) => {
//     writer.on('finish', resolve);
//     writer.on('error', reject);
//   });
// }

// async function processImage(imageUrl, index) {
//   const payload = {
//     image_url: imageUrl,
//     target_polycount: 2500,
//     enable_pbr: false,
//     should_remesh: true,
//     should_texture: true
//   };

//   try {
//     // Step 1: Create the 3D task
//     const createResponse = await axios.post(
//       'https://api.meshy.ai/openapi/v1/image-to-3d',
//       payload,
//       { headers }
//     );
//     const taskId = createResponse.data.result;
//     console.log(`Task created for image: ${imageUrl}`);
//     console.log(`Task ID: ${taskId}`);

//     // Step 2: Wait 4 minutes
//     console.log("Waiting 4 minutes for Meshy AI to process...");
//     await new Promise(r => setTimeout(r, 240000)); 

//     // Step 3: Fetch the result
//     const resultResponse = await axios.get(
//       `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
//       { headers }
//     );

//     const fbxUrl = resultResponse.data.model_urls?.fbx || resultResponse.data.model_url;
//     if (!fbxUrl) {
//       console.error("No FBX URL found for this task.");
//       return;
//     }

//     // Step 4: Download the FBX and save as obj1.fbx, obj2.fbx, etc.
//     const fileName = `obj${index + 1}.fbx`;
//     const savePath = path.join(saveFolder, fileName);
//     console.log(`Downloading FBX to ${savePath}...`);
//     await downloadFile(fbxUrl, savePath);
//     console.log(`Download completed for ${fileName}!`);

//   } catch (error) {
//     console.error(`Error processing image: ${imageUrl}`);
//     console.error(error.response?.data || error.message);
//   }
// }

// async function main() {
//   for (let i = 0; i < images.length; i++) {
//     await processImage(images[i], i);
//   }
// }

// main();
