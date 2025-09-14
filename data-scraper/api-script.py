import requests
import json
import os
from typing import List, Dict, Any
from dotenv import load_dotenv

class ShopifyStorefrontAPI:
    def __init__(self, shop_domain: str, access_token: str):
        """
        Initialize the Shopify Storefront API client
        
        Args:
            shop_domain: Your shop domain (e.g., 'your-shop.myshopify.com')
            access_token: Your Storefront API access token
        """
        self.shop_domain = shop_domain.replace('https://', '').replace('http://', '')
        if not self.shop_domain.endswith('.myshopify.com'):
            self.shop_domain += '.myshopify.com'
        
        self.access_token = access_token
        self.api_url = f"https://{self.shop_domain}/api/2023-10/graphql.json"
        
        self.headers = {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': self.access_token
        }
    
    def get_products_query(self, cursor: str = None, limit: int = 50) -> str:
        """
        GraphQL query to fetch products with pagination
        """
        after_cursor = f', after: "{cursor}"' if cursor else ''
        
        return f"""
        {{
            products(first: {limit}{after_cursor}) {{
                pageInfo {{
                    hasNextPage
                    endCursor
                }}
                edges {{
                    node {{
                        title
                        description
                        variants(first: 1) {{
                            edges {{
                                node {{
                                    price {{
                                        amount
                                        currencyCode
                                    }}
                                }}
                            }}
                        }}
                        images(first: 2) {{
                            edges {{
                                node {{
                                    url
                                }}
                            }}
                        }}
                    }}
                }}
            }}
        }}
        """
    
    def fetch_products(self) -> List[Dict[str, Any]]:
        """
        Fetch all products from the store
        """
        all_products = []
        cursor = None
        has_next_page = True
        
        print("Fetching products from Shopify store...")
        
        while has_next_page:
            query = self.get_products_query(cursor)
            
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json={'query': query}
            )
            
            if response.status_code != 200:
                print(f"Error: HTTP {response.status_code}")
                print(f"Response: {response.text}")
                break
            
            data = response.json()
            
            if 'errors' in data:
                print(f"GraphQL errors: {data['errors']}")
                break
            
            products_data = data['data']['products']
            page_info = products_data['pageInfo']
            
            # Process products from this page
            for edge in products_data['edges']:
                product = self.process_product(edge['node'])
                all_products.append(product)
            
            print(f"Fetched {len(products_data['edges'])} products (Total: {len(all_products)})")
            
            # Check if there are more pages
            has_next_page = page_info['hasNextPage']
            cursor = page_info['endCursor']
        
        print(f"Successfully fetched {len(all_products)} products total!")
        return all_products
    
    def process_product(self, product_node: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process and format product data
        """
        # Get the first variant's price
        price = "N/A"
        if product_node['variants']['edges']:
            first_variant = product_node['variants']['edges'][0]['node']
            if first_variant.get('price'):
                price = f"{first_variant['price']['amount']} {first_variant['price']['currencyCode']}"

        # Get images, keeping only the last one if available
        images = [
            image_edge['node']['url']
            for image_edge in product_node['images']['edges']
        ]
        
        # If there are images, keep only the last one.
        if images:
            images = [images[-1]] 
        
        return {
            'name': product_node['title'],
            'description': product_node['description'],
            'price': price,
            'images': images
        }
    
    def save_to_json(self, products: List[Dict[str, Any]], filename: str = "shopify_products.json"):
        """
        Save products to JSON file in the current directory
        """
        # Get the directory of the current script
        current_dir = os.path.dirname(os.path.abspath(__file__))
        filepath = os.path.join(current_dir, filename)
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(products, f, indent=2, ensure_ascii=False)
            
            print(f"Products saved to: {filepath}")
            print(f"Total products exported: {len(products)}")
            
        except Exception as e:
            print(f"Error saving to file: {e}")

def main():
    """
    Main function to run the script
    """
    # Load environment variables from .env file
    load_dotenv()

    # Configuration - Replace with your actual store details
    SHOP_DOMAIN = "shop-irl-htn"  # Replace with your shop domain
    
    # You can also set these as environment variables for security
    shop_domain = os.getenv('SHOPIFY_SHOP_DOMAIN', SHOP_DOMAIN)
    access_token = os.getenv('SHOPIFY_STOREFRONT_TOKEN')
    
    if not access_token:
        print("⚠️  Please set the SHOPIFY_STOREFRONT_TOKEN environment variable.")
        return

    if shop_domain == "your-shop.myshopify.com":
        print("⚠️  Please update the SHOP_DOMAIN variable in the script")
        print("   or set the SHOPIFY_SHOP_DOMAIN environment variable.")
        return
    
    # Initialize API client
    api = ShopifyStorefrontAPI(shop_domain, access_token)
    
    try:
        # Fetch all products
        products = api.fetch_products()
        
        if products:
            # Save to JSON file
            api.save_to_json(products)
            
            # Print summary
            print("\n" + "="*50)
            print("EXPORT SUMMARY")
            print("="*50)
            print(f"Total products exported: {len(products)}")
            
            if products:
                print(f"Sample product: {products[0]['name']}")
                print(f"Price: {products[0]['price']}")
        else:
            print("No products found or error occurred during fetch.")
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()