// Data: Top 30 Perfumes (12 Mens, 18 Womens)
const products = {
    mens: [
        { name: "Bleu de Chanel", brand: "Chanel", price: 165, icon: "fa-bottle-droplet" },
        { name: "Dior Sauvage", brand: "Dior", price: 155, icon: "fa-vial" },
        { name: "Acqua di Gio", brand: "Giorgio Armani", price: 140, icon: "fa-bottle-droplet" },
        { name: "Creed Aventus", brand: "Creed", price: 435, icon: "fa-vial" },
        { name: "Paco Rabanne 1 Million", brand: "Paco Rabanne", price: 135, icon: "fa-vial" },
        { name: "Le Male", brand: "Jean Paul Gaultier", price: 145, icon: "fa-bottle-droplet" },
        { name: "Tobacco Vanille", brand: "Tom Ford", price: 390, icon: "fa-vial" },
        { name: "Valentino Uomo", brand: "Valentino", price: 160, icon: "fa-bottle-droplet" },
        { name: "Armani Code", brand: "Giorgio Armani", price: 150, icon: "fa-vial" },
        { name: "Versace Eros", brand: "Versace", price: 130, icon: "fa-bottle-droplet" },
        { name: "Invictus Platinum", brand: "Paco Rabanne", price: 155, icon: "fa-vial" },
        { name: "Bvlgari Man In Black", brand: "Bvlgari", price: 165, icon: "fa-bottle-droplet" }
    ],
    womens: [
        { name: "No. 5 Eau de Parfum", brand: "Chanel", price: 215, icon: "fa-bottle-droplet" },
        { name: "Miss Dior", brand: "Dior", price: 185, icon: "fa-vial" },
        { name: "Daisy", brand: "Marc Jacobs", price: 145, icon: "fa-bottle-droplet" },
        { name: "Black Opium", brand: "YSL", price: 195, icon: "fa-vial" },
        { name: "La Vie Est Belle", brand: "Lancome", price: 185, icon: "fa-bottle-droplet" },
        { name: "Gucci Bloom", brand: "Gucci", price: 175, icon: "fa-vial" },
        { name: "Flowerbomb", brand: "Viktor&Rolf", price: 210, icon: "fa-bottle-droplet" },
        { name: "Alien", brand: "Mugler", price: 185, icon: "fa-vial" },
        { name: "Chloe Eau de Parfum", brand: "Chloe", price: 170, icon: "fa-bottle-droplet" },
        { name: "Black Orchid", brand: "Tom Ford", price: 245, icon: "fa-vial" },
        { name: "Prada Candy", brand: "Prada", price: 165, icon: "fa-bottle-droplet" },
        { name: "Light Blue", brand: "Dolce & Gabbana", price: 145, icon: "fa-vial" },
        { name: "Coco Mademoiselle", brand: "Chanel", price: 215, icon: "fa-bottle-droplet" },
        { name: "For Her", brand: "Narciso Rodriguez", price: 175, icon: "fa-vial" },
        { name: "Wood Sage & Sea Salt", brand: "Jo Malone", price: 220, icon: "fa-bottle-droplet" },
        { name: "Good Girl", brand: "Carolina Herrera", price: 190, icon: "fa-vial" },
        { name: "L'Interdit", brand: "Givenchy", price: 180, icon: "fa-bottle-droplet" },
        { name: "Pleasures", brand: "Estee Lauder", price: 135, icon: "fa-vial" }
    ]
};

// Data: Founders
const founders = [
    { name: "DARREN SMITH", role: "Co-Founder & Director" },
    { name: "LEE BAILIE", role: "Co-Founder & Operations" },
    { name: "CRAIG STEVENSON", role: "Co-Founder & Logistics" },
    { name: "BARRY MCPHEE", role: "Founding Partner" },
    { name: "LES BRADSHAW", role: "Brand Strategist" },
    { name: "CODY LEE SCOTT", role: "Creative Director" },
    { name: "FIONA FAIRCLOUGH", role: "Head of Curation" },
    { name: "KYLIE ORTIS", grandmother: "Customer Excellence" },
    { name: "THOMAS J F", role: "Tech & AI lead" },
    { name: "VANESSA SCHULTZ", role: "Finance & Legal" }
];

// Initialize Catalog
function renderProducts(category) {
    const catalog = document.getElementById('products-catalog');
    catalog.innerHTML = '';
    
    products[category].forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-img"><i class="fa-solid ${p.icon}"></i></div>
            <h4>${p.name}</h4>
            <p style="font-size: 0.75rem; color: #888;">${p.brand}</p>
            <p class="product-price">AUD $${p.price.toFixed(2)}</p>
            <button class="btn btn-outline btn-add-cart" style="padding: 10px 15px;">Add To Cart</button>
        `;
        catalog.appendChild(card);
    });
}

// Initialize Founders
function renderFounders() {
    const list = document.getElementById('founder-list');
    founders.forEach(f => {
        const card = document.createElement('div');
        card.className = 'founder-card';
        card.innerHTML = `
            <div class="founder-circle"><i class="fa-solid fa-user-tie"></i></div>
            <h4>${f.name}</h4>
            <p>${f.role || 'Founding Partner'}</p>
        `;
        list.appendChild(card);
    });
}

// AI Chatbot Logic
const chatTrigger = document.getElementById('chat-trigger');
const chatWidget = document.getElementById('ai-chat-widget');
const closeChat = document.getElementById('close-chat');
const sendMsg = document.getElementById('send-chat');
const chatInput = document.getElementById('user-chat-input');
const chatMessages = document.getElementById('chat-messages');

chatTrigger.addEventListener('click', () => {
    chatWidget.style.display = 'flex';
    chatTrigger.style.display = 'none';
});

closeChat.addEventListener('click', () => {
    chatWidget.style.display = 'none';
    chatTrigger.style.display = 'flex';
});

function appendMsg(msg, isAi = false) {
    const div = document.createElement('div');
    div.className = isAi ? 'ai-msg' : 'user-msg';
    div.innerHTML = msg;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendMsg.addEventListener('click', () => {
    const msg = chatInput.value.trim();
    if (!msg) return;
    
    appendMsg(msg, false);
    chatInput.value = '';
    
    // Simple AI Simulation logic
    setTimeout(() => {
        let reply = "I'm looking into that for you. Did you know **The Scent of Adelaide** offers free shipping on orders over $150 AUD?";
        if (msg.toLowerCase().includes("hi") || msg.toLowerCase().includes("hello")) {
            reply = "Hello! I'm the Adelaide AI support. How can I assist with your fragrance selection?";
        } else if (msg.toLowerCase().includes("shipping")) {
            reply = "We offer same-day processing for all AUD orders. Standard delivery takes 3-5 business days via our automated logistics network.";
        } else if (msg.toLowerCase().includes("founder") || msg.toLowerCase().includes("who owns")) {
            reply = "The Scent of Adelaide was founded by a collective of 10 visionaries, including Darren Smith, Lee Bailie, and Thomas J F.";
        } else if (msg.toLowerCase().includes("return") || msg.toLowerCase().includes("refund")) {
            reply = "We offer a 30-day refund policy for unopened products. Refunds are processed in AUD via our Stripe gateway.";
        }
        appendMsg(reply, true);
    }, 800);
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMsg.click();
});

// Legal Modal Logic
const modal = document.getElementById('policy-modal');
const closeModal = document.querySelector('.close-modal');
const policyBody = document.getElementById('policy-body');

const policies = {
    shipping: `
        <h2>Shipping Policy</h2>
        <p>At **The Scent of Adelaide**, we automate our fulfillment via CJ Dropshipping and local logistics to ensure rapid delivery.</p>
        <ul>
            <li>Free shipping for orders over $150 AUD.</li>
            <li>Flat rate of $15 AUD for all other domestic orders.</li>
            <li>Tracking numbers are sent automatically via email.</li>
        </ul>
    `,
    refunds: `
        <h2>Refunds & Returns</h2>
        <p>Your satisfaction is our priority. If you change your mind, we offer returns under the following conditions:</p>
        <ul>
            <li>Product must be in original, unopened packaging.</li>
            <li>Request must be made within 30 days of purchase.</li>
            <li>Refunds are issued to the original Stripe payment method.</li>
        </ul>
    `,
    privacy: `
        <h2>Privacy Policy</h2>
        <p>We take your privacy seriously. Your data is encrypted and used only for fulfilling orders and communicating via our opt-in newsletter.</p>
        <p>ABN: 82 697 448 668 (Registered in Adelaide, Australia - No GST applied).</p>
    `,
    legal: `
        <h2>Legal Disclaimer</h2>
        <p>The Scent of Adelaide is an independent boutique. We are not affiliated with the perfume brands we sell, other than as official retailers or via authorized distribution networks.</p>
        <p>All pricing is in AUD. We operate under strict Australian Consumer Law.</p>
    `
};

document.querySelectorAll('.legal-trigger').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        policyBody.innerHTML = policies[page] || "Content not found.";
        modal.style.display = 'block';
    });
});

closeModal.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target == modal) modal.style.display = 'none'; });

// Cart Simulation
let cartCountValue = 0;
const cartCount = document.getElementById('cart-count');

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-add-cart')) {
        cartCountValue++;
        cartCount.innerText = cartCountValue;
        e.target.innerText = "Added!";
        setTimeout(() => e.target.innerText = "Add To Cart", 2000);
        
        // Automated notification simulator
        console.log(`[AI-SYSTEM] Cart updated. Inventory sync for segment ADL...`);
    }
});

// Tabs logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProducts(btn.getAttribute('data-category'));
    });
});

// Newsletter
document.getElementById('newsletter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletter-email').value;
    alert(`Thank you! A verification email has been sent to ${email} with your 10% discount code.`);
    e.target.reset();
});

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    renderProducts('mens');
    renderFounders();
    
    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});
