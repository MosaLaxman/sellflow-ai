import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding authoritative demo catalog for SellFlow AI...');

  // 1. Create or update primary demo merchant: "Apex Performance Gear"
  const passwordHash = await bcrypt.hash('MerchantPassword123!', 10);
  const merchant = await prisma.merchant.upsert({
    where: { slug: 'apex-sports' },
    update: {
      name: 'Apex Performance Gear',
      email: 'merchant@apexperformance.com',
      passwordHash,
      currency: 'INR',
      logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop',
    },
    create: {
      name: 'Apex Performance Gear',
      slug: 'apex-sports',
      email: 'merchant@apexperformance.com',
      passwordHash,
      currency: 'INR',
      logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop',
    },
  });

  // 2. Configure merchant AI and risk policy
  await prisma.merchantPolicy.upsert({
    where: { merchantId: merchant.id },
    update: {
      maxAutomaticUpsellPercentage: 50.0,
      maxAutonomousOrderAmount: 1000000, // ₹10,000 (in paise)
      allowUpsell: true,
      allowCrossSell: true,
      requireCustomerConfirmation: true,
      allowAIDiscount: false,
      requireApprovalForDiscount: true,
      maxProductsPerRecommendation: 3,
      maxUpsellItems: 1,
    },
    create: {
      merchantId: merchant.id,
      maxAutomaticUpsellPercentage: 50.0,
      maxAutonomousOrderAmount: 1000000, // ₹10,000 (in paise)
      allowUpsell: true,
      allowCrossSell: true,
      requireCustomerConfirmation: true,
      allowAIDiscount: false,
      requireApprovalForDiscount: true,
      maxProductsPerRecommendation: 3,
      maxUpsellItems: 1,
    },
  });

  // 3. Clear existing relations & products for fresh seed
  await prisma.productRelation.deleteMany({ where: { merchantId: merchant.id } });
  await prisma.product.deleteMany({ where: { merchantId: merchant.id } });

  // 4. Create authoritative catalog products

  // --- FOOTWEAR ---
  const runnerPro = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'Runner Pro 2',
      description: 'High-performance daily road running shoes with breathable jacquard mesh and responsive nitrogen-infused foam cushioning.',
      category: 'Footwear',
      priceMinor: 349900, // ₹3,499
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=450&fit=crop',
      stockQuantity: 25,
      status: 'ACTIVE',
      tags: ['running', 'shoes', 'shoe', 'footwear', 'sneakers', 'lightweight', 'daily running', 'cushioned', 'road', 'road running', 'road training'],
      useCases: ['daily running', 'road training', 'daily road training', 'jogging', '5k training', 'treadmill'],
      attributes: {
        weight: '240g',
        heelDrop: '8mm',
        cushion: 'High',
        closure: 'Lace-up',
        color: 'Crimson Red / Black',
      },
    },
  });

  const strideMaster = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'Stride Master Elite',
      description: 'Lightweight road runner engineered for endurance and high-cadence daily mileage with dual-density midsole.',
      category: 'Footwear',
      priceMinor: 389900, // ₹3,899
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=450&fit=crop',
      stockQuantity: 18,
      status: 'ACTIVE',
      tags: ['running', 'shoes', 'shoe', 'footwear', 'sneakers', 'endurance', 'daily running', 'road racing'],
      useCases: ['daily running', 'marathon training', 'long distance', 'tempo runs'],
      attributes: {
        weight: '225g',
        heelDrop: '6mm',
        cushion: 'Responsive',
        closure: 'Lace-up',
        color: 'Carbon Black / Neon',
      },
    },
  });

  const trailClimber = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'TerraClimb Grip Pro',
      description: 'Rugged all-terrain trail shoe with 5mm directional rubber lugs, reinforced toe guard, and water-repellent upper.',
      category: 'Footwear',
      priceMinor: 429900, // ₹4,299
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&h=450&fit=crop',
      stockQuantity: 12,
      status: 'ACTIVE',
      tags: ['trail', 'hiking', 'outdoor', 'waterproof', 'rugged', 'shoes', 'shoe', 'footwear'],
      useCases: ['trail running', 'hiking', 'mountain jogging', 'wet conditions'],
      attributes: {
        weight: '290g',
        lugDepth: '5mm',
        cushion: 'Moderate',
        waterproofing: 'DWR Coated',
      },
    },
  });

  const paceAero = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'Pace Aero Speed',
      description: 'Ultra-lightweight racer featuring full-length carbon fiber propulsion plate and minimalist upper for race days.',
      category: 'Footwear',
      priceMinor: 599900, // ₹5,999
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=450&fit=crop',
      stockQuantity: 8,
      status: 'ACTIVE',
      tags: ['racing', 'carbon plate', 'lightweight', 'speed', 'competition', 'shoes', 'shoe', 'footwear'],
      useCases: ['marathon race', 'half marathon', 'speed work', 'interval training'],
      attributes: {
        weight: '198g',
        plateType: 'Carbon Fiber',
        heelDrop: '4mm',
      },
    },
  });

  const velocityRacer = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'Apex Velocity Marathon Carbon Racer',
      description: 'Elite marathon competition shoe featuring dual PEBA supercritical foam layers and an integrated curved carbon wing plate.',
      category: 'Footwear',
      priceMinor: 749900, // ₹7,499
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&h=450&fit=crop',
      stockQuantity: 10,
      status: 'ACTIVE',
      tags: ['racing', 'carbon plate', 'marathon', 'competition', 'shoes', 'shoe', 'footwear', 'superfoam'],
      useCases: ['marathon race', 'official competition', 'speed trials', 'sub-3 race'],
      attributes: {
        weight: '185g',
        plateType: 'Curved Full-Length Carbon',
        midsoleFoam: 'PEBA Supercritical',
        heelDrop: '6mm',
      },
    },
  });

  // --- APPAREL (T-SHIRTS, SHORTS, JACKETS, BRAS) ---
  const aeroTee = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'AeroVent Ultra-Lightweight Tech Running Tee',
      description: 'Engineered micro-mesh running shirt with 360-degree ventilation, flatlock anti-chafe seams, and UPF 30+ sun protection.',
      category: 'Apparel',
      priceMinor: 119900, // ₹1,199
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&h=450&fit=crop',
      stockQuantity: 20,
      status: 'ACTIVE',
      tags: ['apparel', 't-shirt', 'tshirt', 't shirt', 'tee', 'tees', 'shirt', 'shirts', 'running tee', 'breathable', 'anti-odor', 'top'],
      useCases: ['daily running', 'gym', 'summer jogging', 'marathon', 'workout'],
      attributes: {
        fabric: '100% Recycled Polyester Mesh',
        fit: 'Athletic Slim',
        reflective: 'Front & Back Reflective Logos',
        color: 'Cobalt Blue / Steel Grey',
      },
    },
  });

  const proDryTee = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'Pro-Dry Graphic Performance Training T-Shirt',
      description: 'Rapid moisture-wicking athletic t-shirt with 4-way stretch fabric, antimicrobial odor defense, and relaxed ergonomic fit.',
      category: 'Apparel',
      priceMinor: 149900, // ₹1,499
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&h=450&fit=crop',
      stockQuantity: 25,
      status: 'ACTIVE',
      tags: ['apparel', 't-shirt', 'tshirt', 't shirt', 'tee', 'tees', 'shirt', 'shirts', 'gym tee', 'training', 'workout', 'top'],
      useCases: ['gym training', 'weightlifting', 'crossfit', 'daily workout', 'running'],
      attributes: {
        fabric: '88% Poly, 12% Spandex',
        fit: 'Regular Athletic',
        features: 'Anti-Odor Microban Coating',
        color: 'Heather Charcoal',
      },
    },
  });

  const runningShorts = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'EnduroSpeed 5-Inch 2-in-1 Running Shorts',
      description: 'Featherlight woven running shorts with integrated anti-chafing compression liner, zipper phone pocket, and laser-cut vents.',
      category: 'Apparel',
      priceMinor: 169900, // ₹1,699
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&h=450&fit=crop',
      stockQuantity: 22,
      status: 'ACTIVE',
      tags: ['apparel', 'shorts', 'short', 'running shorts', 'bottoms', 'compression', 'workout'],
      useCases: ['daily running', 'marathon training', 'gym workouts', 'sprints'],
      attributes: {
        inseam: '5 inches',
        liner: 'Built-in Boxer Brief Compression',
        pockets: 'Zippered Back Phone Pocket + 2 Stash Pockets',
        color: 'Matte Black',
      },
    },
  });

  const windbreakerJacket = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'ThermalShield Ultralight Windbreaker Running Jacket',
      description: 'Packable wind-resistant and water-repellent running jacket with underarm ventilation mesh, thumbhole cuffs, and 360-degree reflectivity.',
      category: 'Apparel',
      priceMinor: 299900, // ₹2,999
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&h=450&fit=crop',
      stockQuantity: 15,
      status: 'ACTIVE',
      tags: ['apparel', 'jacket', 'windbreaker', 'outerwear', 'hoodie', 'coat', 'running jacket', 'waterproof'],
      useCases: ['cold weather running', 'rainy runs', 'night running', 'hiking'],
      attributes: {
        fabric: 'Ripstop Ultralight Nylon with DWR',
        weight: '110g',
        packable: 'Packs into its own chest pocket',
        color: 'Hi-Vis Electric Lime / Slate',
      },
    },
  });

  const sportsBra = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'AeroFit High-Impact Seamless Sports Bra',
      description: 'Maximum support racerback sports bra with moisture-wicking molded cups, wide elastic underband, and breathable mesh back panel.',
      category: 'Apparel',
      priceMinor: 129900, // ₹1,299
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=450&fit=crop',
      stockQuantity: 18,
      status: 'ACTIVE',
      tags: ['apparel', 'bra', 'sports bra', 'sportsbra', 'tank', 'top', 'workout', 'fitness'],
      useCases: ['running', 'high-intensity interval training', 'gym workout', 'yoga'],
      attributes: {
        supportLevel: 'High Impact',
        closure: 'Pull-on Racerback',
        fabric: 'Sweat-wicking PowerStretch Nylon',
        color: 'Deep Teal',
      },
    },
  });

  // --- ACCESSORIES & EQUIPMENT ---
  const runningSocks = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'Pro Cushion Anti-Blister Running Socks (3-Pack)',
      description: 'Anatomically designed performance running socks with seamless toe, arch compression, and moisture-wicking yarns.',
      category: 'Accessories',
      priceMinor: 49900, // ₹499
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600&h=450&fit=crop',
      stockQuantity: 50,
      status: 'ACTIVE',
      tags: ['socks', 'sock', 'accessories', 'anti-blister', 'running gear', 'comfort', 'hosiery'],
      useCases: ['daily running', 'training', 'race day', 'marathon'],
      attributes: {
        material: '80% CoolMax, 15% Nylon, 5% Elastane',
        packSize: '3 pairs',
        cushioning: 'Targeted Sole Padding',
      },
    },
  });

  const hydrationFlask = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'AeroHydrate 500ml Soft Flask with Bite Valve',
      description: 'Collapsible TPU running water bottle with high-flow bite valve that shrinks as you drink to eliminate sloshing.',
      category: 'Equipment',
      priceMinor: 79900, // ₹799
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=450&fit=crop',
      stockQuantity: 30,
      status: 'ACTIVE',
      tags: ['hydration', 'flask', 'bottle', 'bottles', 'water bottle', 'waterbottle', 'marathon gear', 'equipment'],
      useCases: ['long distance running', 'trail running', 'marathon training'],
      attributes: {
        capacity: '500ml',
        material: 'BPA & PVC-free TPU',
        weight: '38g',
      },
    },
  });

  const sweatbandSet = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'PulseGrip Sweat-Wicking Headband & Wristband Set',
      description: 'High-absorption terry blend headband and dual wristbands designed to keep sweat out of eyes during intense workouts.',
      category: 'Accessories',
      priceMinor: 34900, // ₹349
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&h=450&fit=crop',
      stockQuantity: 40,
      status: 'ACTIVE',
      tags: ['headband', 'wristband', 'band', 'bands', 'sweatband', 'accessories', 'workout'],
      useCases: ['running', 'gym training', 'badminton', 'tennis', 'crossfit'],
      attributes: {
        material: '85% Cotton Terry, 10% Spandex, 5% Nylon',
        includes: '1 Headband + 2 Wristbands',
        washable: 'Machine Washable',
      },
    },
  });

  const ledArmband = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'NightLume LED High-Visibility Running Armband',
      description: 'Ultra-bright rechargeable LED safety armband with solid and strobe light modes for dusk, dawn, and night running visibility.',
      category: 'Accessories',
      priceMinor: 59900, // ₹599
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=450&fit=crop',
      stockQuantity: 35,
      status: 'ACTIVE',
      tags: ['armband', 'led', 'safety', 'night running', 'reflector', 'accessories', 'band'],
      useCases: ['night running', 'early morning jogging', 'cycling', 'outdoor safety'],
      attributes: {
        battery: 'Type-C USB Rechargeable (12h battery life)',
        modes: 'Steady Glow, Rapid Flash, Slow Pulse',
        waterproof: 'IPX4 Splashproof',
      },
    },
  });

  const waistPack = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'AeroBelt Bounce-Free Running Waist Pack',
      description: 'Zero-bounce ultra-slim stretch running belt with waterproof zippered pocket for smartphones up to 6.8 inches, keys, and energy gels.',
      category: 'Equipment',
      priceMinor: 89900, // ₹899
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=450&fit=crop',
      stockQuantity: 28,
      status: 'ACTIVE',
      tags: ['belt', 'pouch', 'waist pack', 'running belt', 'bag', 'equipment', 'accessories', 'hydration'],
      useCases: ['daily running', 'half marathon', 'trail running', 'walking'],
      attributes: {
        fitsPhones: 'Up to 6.8 inch screens (iPhone Pro Max / Galaxy Ultra)',
        waistSize: 'Adjustable 26 to 44 inches',
        zipper: 'Waterproof taped zipper',
      },
    },
  });

  const foamRoller = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      name: 'UltraFoam High-Density Deep Tissue Recovery Roller',
      description: 'Multi-density EVA textured foam roller designed for post-workout myofascial release, soothing IT bands, calves, and back tension.',
      category: 'Equipment',
      priceMinor: 159900, // ₹1,599
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=450&fit=crop',
      stockQuantity: 16,
      status: 'ACTIVE',
      tags: ['roller', 'foam roller', 'foamroller', 'recovery', 'massage', 'equipment', 'physiotherapy'],
      useCases: ['post-run recovery', 'muscle soreness', 'mobility training', 'stretching'],
      attributes: {
        length: '33cm x 14cm diameter',
        material: 'High-Density Eco EVA + Solid ABS Core',
        weightCapacity: '200kg',
      },
    },
  });

  // 5. Seed Comprehensive Product Relations (Upsell & Cross-Sell)
  await prisma.productRelation.createMany({
    data: [
      // Footwear -> Accessories / Apparel Upsells & Cross-sells
      {
        merchantId: merchant.id,
        productId: runnerPro.id,
        relatedProductId: runningSocks.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.95,
      },
      {
        merchantId: merchant.id,
        productId: runnerPro.id,
        relatedProductId: aeroTee.id,
        relationType: 'CROSS_SELL',
        confidence: 0.85,
      },
      {
        merchantId: merchant.id,
        productId: runnerPro.id,
        relatedProductId: runningShorts.id,
        relationType: 'CROSS_SELL',
        confidence: 0.80,
      },
      {
        merchantId: merchant.id,
        productId: strideMaster.id,
        relatedProductId: runningSocks.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.95,
      },
      {
        merchantId: merchant.id,
        productId: strideMaster.id,
        relatedProductId: waistPack.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.88,
      },
      {
        merchantId: merchant.id,
        productId: trailClimber.id,
        relatedProductId: hydrationFlask.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.92,
      },
      {
        merchantId: merchant.id,
        productId: trailClimber.id,
        relatedProductId: windbreakerJacket.id,
        relationType: 'CROSS_SELL',
        confidence: 0.82,
      },
      {
        merchantId: merchant.id,
        productId: paceAero.id,
        relatedProductId: runningSocks.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.95,
      },
      {
        merchantId: merchant.id,
        productId: paceAero.id,
        relatedProductId: hydrationFlask.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.85,
      },
      {
        merchantId: merchant.id,
        productId: velocityRacer.id,
        relatedProductId: runningSocks.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.95,
      },
      {
        merchantId: merchant.id,
        productId: velocityRacer.id,
        relatedProductId: aeroTee.id,
        relationType: 'CROSS_SELL',
        confidence: 0.90,
      },

      // Apparel -> Accessories & Matching Items
      {
        merchantId: merchant.id,
        productId: aeroTee.id,
        relatedProductId: runningShorts.id,
        relationType: 'CROSS_SELL',
        confidence: 0.90,
      },
      {
        merchantId: merchant.id,
        productId: aeroTee.id,
        relatedProductId: sweatbandSet.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.92,
      },
      {
        merchantId: merchant.id,
        productId: proDryTee.id,
        relatedProductId: runningShorts.id,
        relationType: 'CROSS_SELL',
        confidence: 0.88,
      },
      {
        merchantId: merchant.id,
        productId: proDryTee.id,
        relatedProductId: sweatbandSet.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.90,
      },
      {
        merchantId: merchant.id,
        productId: runningShorts.id,
        relatedProductId: aeroTee.id,
        relationType: 'CROSS_SELL',
        confidence: 0.90,
      },
      {
        merchantId: merchant.id,
        productId: runningShorts.id,
        relatedProductId: runningSocks.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.85,
      },
      {
        merchantId: merchant.id,
        productId: windbreakerJacket.id,
        relatedProductId: ledArmband.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.92,
      },
      {
        merchantId: merchant.id,
        productId: windbreakerJacket.id,
        relatedProductId: aeroTee.id,
        relationType: 'CROSS_SELL',
        confidence: 0.88,
      },
      {
        merchantId: merchant.id,
        productId: sportsBra.id,
        relatedProductId: runningShorts.id,
        relationType: 'CROSS_SELL',
        confidence: 0.88,
      },
      {
        merchantId: merchant.id,
        productId: sportsBra.id,
        relatedProductId: sweatbandSet.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.90,
      },

      // Equipment & Recovery
      {
        merchantId: merchant.id,
        productId: foamRoller.id,
        relatedProductId: runningSocks.id,
        relationType: 'CROSS_SELL',
        confidence: 0.75,
      },
      {
        merchantId: merchant.id,
        productId: waistPack.id,
        relatedProductId: hydrationFlask.id,
        relationType: 'COMPATIBLE_ACCESSORY',
        confidence: 0.90,
      },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log(`   Merchant: ${merchant.name} (slug: ${merchant.slug})`);
  console.log('   Products seeded: 13 diverse items across Footwear, Apparel, Accessories & Equipment');
  console.log('   Product relations: 21 directional edges for bounded upsell/cross-sell');
  console.log('   Zero synthetic orders or artificial metrics created.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

