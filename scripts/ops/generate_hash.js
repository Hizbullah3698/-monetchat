const bcrypt = require('bcryptjs');

async function run() {
    const sellerHash = await bcrypt.hash('SellerPass123!', 10);
    const adminHash = await bcrypt.hash('AdminSecret1!', 10);
    console.log(`SELLER_HASH=${sellerHash}`);
    console.log(`ADMIN_HASH=${adminHash}`);
}
run();
