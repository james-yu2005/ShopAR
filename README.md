# ShopAR 

<img width="470" height="462" alt="image" src="https://github.com/user-attachments/assets/7c8158ab-3884-4768-836a-2b67fb8c1d0b" />

### Overview 🕶️

ShopAR integrates **augmented reality Snapchat Spectacles** with the **Shopify ecosystem**, providing an exciting technical demo of the future of *interactive online commerce*.

<img width="414" height="506" alt="image" src="https://github.com/user-attachments/assets/a81f53a5-0ddf-4abe-80ae-e0cf444fb33f" />
<img width="414" height="506" alt="image" src="https://github.com/user-attachments/assets/7665746c-d057-4ae0-ae3a-65fd4a664c0c" />


### Motivation 💡

One major drawback of online storefronts when compared to physical businesses is the difficulty of visualizing the product to be purchased physically. We intend to overcome this challenge by using AR to allow consumer visualization of products, which leads to increased consumer engagement and a click-to-purchase conversion rate.

### Design 💻

We apply the Shopify Storefront API to collect product details from a specific vendor, which will pull data including product descriptions, names, and renderings, as well as physical measurements. We utilize a diffusion model with an API provided by Meshy to convert our 2D product illustration into a 3D model. We then scale our generated model with the collected measurements and import it into Lens Studio, where we further apply texturing + physics and cloth simulation, as appropriate. Finally, we upload this data to the Spectacles, where potential users can interact and move the selected product throughout the environment.

This pipeline has a handy Chrome extension that allows users to monitor the progress of this pipeline.

### Challenges Encountered 🛠️
    
- Integration of workflows and different APIs to create a seamless experience
- Hi-poly and physics/collision/cloth simulation causing latency
- Adapting to the Lens Studio IDE and workflow
