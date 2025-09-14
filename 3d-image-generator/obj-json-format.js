import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder to save JSON files
const saveFolder = path.join(__dirname, 'fbx-downloads-format');
if (!fs.existsSync(saveFolder)) fs.mkdirSync(saveFolder);

// Load products.json file
const filePath = path.join(__dirname, '../data-scraper/products.json');
const productsJsonData = fs.readFileSync(filePath, 'utf-8');
const products = JSON.parse(productsJsonData);

// Helper function to extract link from description
const extractLink = (description) => {
  const match = description.match(/Link:\s*(\S+)/);
  return match ? match[1] : "";
};

// Create separate JSON for each product
products.forEach((product, index) => {
  const objName = `obj${index + 1}`;
  const jsonData = {
    price: product.price,
    link: extractLink(product.description),
    scale: 37.5,
    images: product.images || []
  };
  const jsonPath = path.join(saveFolder, `${objName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.log(`Saved ${objName}.json`);
});

console.log(`Created ${products.length} JSON files successfully!`);