
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});

const { db, firebaseConfigured } = require('../src/config/firebase');

const {
  GeoPoint,
  FieldValue,
} = require('firebase-admin/firestore');

if (!firebaseConfigured || !db) {
  console.error(
    'Firebase est désactivé. Vérifie FIREBASE_ENABLED=true dans backend/.env'
  );
  process.exit(1);
}

const DEMO_MERCHANTS = [

  // ==========================================
  // COMMERÇANT 1 : CAFÉ CHEZ NOUS
  // ==========================================
  {
    uid: 'seed_cafe_chez_nous_001',
    businessName: 'Café Chez Nous',
    description: 'Cafétéria située à proximité de l’ESSECT.',
    address: 'Avenue Ali Trad, Tunis',
    phone: '90405341',
    category: 'cafeteria',
    latitude: 36.78756691162696,
    longitude: 10.174288628836058,

    offers: [
      {
        id: 'express',
        title: 'Café Express',
        description: 'Café chaud - offre de démonstration CampusSave.',
        price: 1.9,
        originalPrice: 2.5,
        quantity: 10,
        category: 'cafeteria',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Tazzina_di_caff%C3%A8_a_Ventimiglia.jpg',
        pickupStart: '06:00',
        pickupEnd: '22:00',
      },
      {
        id: 'cappuccino',
        title: 'Cappuccino',
        description: 'Délicieux cappuccino chaud avec une mousse de lait onctueuse.',
        price: 2,
        originalPrice: 2.5,
        quantity: 10,
        category: 'cafeteria',
        imageUrl: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=800&q=80',
        pickupStart: '08:00',
        pickupEnd: '18:00',
      },
      {
        id: 'the-infusion',
        title: 'Thé infusion',
        description: 'Thé infusion chaud, idéal pour une petite pause.',
        price: 2,
        originalPrice: 2.5,
        quantity: 10,
        category: 'cafeteria',
        imageUrl: 'https://lemust.ca/wp-content/uploads/2019/11/THE-740x493.jpg',
        pickupStart: '08:00',
        pickupEnd: '18:00',
      },
      {
        id: 'citronnade',
        title: 'Citronnade',
        description: 'Boisson fraîche au citron, parfaite pour se rafraîchir.',
        price: 2.5,
        originalPrice: 3,
        quantity: 8,
        category: 'cafeteria',
        imageUrl: 'https://i0.wp.com/lespetitssecretsdelolo.com/wp-content/uploads/2025/07/Citronnade-rapide-au-blender.jpg?resize=768%2C1024&ssl=1',
        pickupStart: '09:00',
        pickupEnd: '18:00',
      },
      {
        id: 'jus-fraise',
        title: 'Jus de fraise',
        description: 'Jus de fraise frais et fruité.',
        price: 3,
        originalPrice: 3.5,
        quantity: 8,
        category: 'cafeteria',
        imageUrl: 'https://terranatmeximieux.biocoop.net/images/600/800/docs/moduledatas/63/jus-de-fraisse.webp',
        pickupStart: '09:00',
        pickupEnd: '18:00',
      },
      {
        id: 'croissant',
        title: 'Croissant',
        description: 'Croissant frais et croustillant pour le petit-déjeuner.',
        price: 1.7,
        originalPrice: 2.2,
        quantity: 12,
        category: 'boulangerie',
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80',
        pickupStart: '07:00',
        pickupEnd: '17:00',
      },
      {
        id: 'pate',
        title: 'Pâté',
        description: 'Pâté salé, idéal pour une pause gourmande.',
        price: 2,
        originalPrice: 2.5,
        quantity: 10,
        category: 'boulangerie',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYnfyJqmsV9L3ND-5e5_-BQHYT0JLH0oHmcWfTeYGztw&s=10',
        pickupStart: '08:00',
        pickupEnd: '17:00',
      },
      {
        id: 'sandwich',
        title: 'Sandwich',
        description: 'Sandwich préparé pour une pause déjeuner rapide.',
        price: 3,
        originalPrice: 4,
        quantity: 8,
        category: 'cafeteria',
        imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
        pickupStart: '11:00',
        pickupEnd: '16:00',
      },
      {
        id: 'cookies',
        title: 'Cookies',
        description: 'Cookies gourmands aux pépites de chocolat.',
        price: 5,
        originalPrice: 6,
        quantity: 10,
        category: 'patisserie',
        imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80',
        pickupStart: '09:00',
        pickupEnd: '18:00',
      },
    ],

    surpriseBaskets: [
      {
        id: 'petit-dejeuner',
        title: 'Panier Petit-Déjeuner',
        description: 'Un assortiment surprise de croissant, pâté et boisson chaude.',
        originalPrice: 6,
        discountedPrice: 3.5,
        quantity: 8,
        category: 'cafeteria',
        imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80',
        pickupStart: '08:00',
        pickupEnd: '11:00',
      },
      {
        id: 'pause-gourmande',
        title: 'Panier Pause Gourmande',
        description: 'Un assortiment surprise de cookies, viennoiseries et boisson.',
        originalPrice: 8,
        discountedPrice: 4.5,
        quantity: 6,
        category: 'cafeteria',
        imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80',
        pickupStart: '14:00',
        pickupEnd: '18:00',
      },
    ],
  },

  // ==========================================
  // COMMERÇANT 2 : CAFÉ VIRAGE
  // ==========================================
  {
    uid: 'seed_cafe_virage_001',
    businessName: 'Café Virage',
    description: 'Café proposant des boissons gourmandes et une sélection de restauration rapide.',
    address: 'Tunis',
    category: 'cafeteria',
    latitude: 36.78525160066839,
    longitude: 10.174928448630316,

    offers: [
      {
        id: 'espresso',
        title: 'Espresso',
        description: 'Café espresso court, intense et aromatique.',
        price: 1.8,
        originalPrice: 2.2,
        quantity: 12,
        category: 'cafeteria',
        imageUrl: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=800&q=80',
        pickupStart: '07:00',
        pickupEnd: '18:00',
      },
      {
        id: 'iced-caramel-latte',
        title: 'Iced Caramel Latte',
        description: 'Café glacé au lait avec une délicieuse touche de caramel.',
        price: 4,
        originalPrice: 5,
        quantity: 8,
        category: 'cafeteria',
        imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80',
        pickupStart: '09:00',
        pickupEnd: '18:00',
      },
      {
        id: 'chocolat-chaud',
        title: 'Chocolat chaud',
        description: 'Boisson chaude au chocolat, onctueuse et réconfortante.',
        price: 3,
        originalPrice: 3.5,
        quantity: 8,
        category: 'cafeteria',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZCc_BN-VyXtsNt7PxhBw0E_iRhTTUx0BUip2QZ-0oAw&s=10',
        pickupStart: '08:00',
        pickupEnd: '18:00',
      },
      {
        id: 'panini-thon',
        title: 'Panini thon',
        description: 'Panini grillé garni de thon et de fromage.',
        price: 5.5,
        originalPrice: 6.5,
        quantity: 8,
        category: 'restaurant',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR22Gcpmp-k0puNyeekKsrP5xKBdst5bt2j5yBbsWMu4A&s=10',
        pickupStart: '11:00',
        pickupEnd: '16:00',
      },
      {
        id: 'part-pizza',
        title: 'Part de pizza',
        description: 'Part de pizza à la tomate et au fromage.',
        price: 3.5,
        originalPrice: 4.5,
        quantity: 10,
        category: 'restaurant',
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        pickupStart: '11:00',
        pickupEnd: '17:00',
      },
      {
        id: 'crepe-chocolat',
        title: 'Crêpe chocolat',
        description: 'Crêpe sucrée garnie de chocolat.',
        price: 4.5,
        originalPrice: 5.5,
        quantity: 8,
        category: 'patisserie',
        imageUrl: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&w=800&q=80',
        pickupStart: '14:00',
        pickupEnd: '19:00',
      },
    ],

    surpriseBaskets: [
      {
        id: 'cafe-gourmand',
        title: 'Panier Café Gourmand',
        description: 'Un assortiment surprise de café et de douceurs sucrées.',
        originalPrice: 9,
        discountedPrice: 5,
        quantity: 6,
        category: 'cafeteria',
        imageUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80',
        pickupStart: '14:00',
        pickupEnd: '18:00',
      },
      {
        id: 'snack-sale',
        title: 'Panier Snack Salé',
        description: 'Un assortiment surprise de panini et de part de pizza.',
        originalPrice: 10,
        discountedPrice: 6,
        quantity: 8,
        category: 'restaurant',
        imageUrl: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=800&q=80',
        pickupStart: '12:00',
        pickupEnd: '17:00',
      },
    ],
  },

  // ==========================================
  // COMMERÇANT 3 : GHARBI HENDA
  // ==========================================
  {
    uid: 'seed_gharbi_henda_001',
    businessName: 'Gharbi Henda',
    description: 'Restaurant brunch proposant des petits-déjeuners gourmands, des plats salés et des boissons fraîches.',
    address: 'Tunis',
    category: 'restaurant',
    latitude: 36.78720579589063,
    longitude: 10.177873143370423,

    offers: [
      {
        id: 'pancakes',
        title: 'Pancakes au chocolat',
        description: 'Pancakes moelleux servis avec une généreuse garniture au chocolat.',
        price: 8,
        originalPrice: 10,
        quantity: 8,
        category: 'patisserie',
        imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=800&q=80',
        pickupStart: '09:00',
        pickupEnd: '16:00',
      },
      {
        id: 'avocado-toast',
        title: 'Avocado Toast',
        description: 'Pain grillé garni d’avocat frais et d’assaisonnement.',
        price: 9,
        originalPrice: 11,
        quantity: 6,
        category: 'restaurant',
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
        pickupStart: '09:00',
        pickupEnd: '15:00',
      },
      {
        id: 'omelette-fromage',
        title: 'Omelette au fromage',
        description: 'Omelette préparée avec des œufs frais et du fromage.',
        price: 7,
        originalPrice: 8.5,
        quantity: 8,
        category: 'restaurant',
        imageUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=800&q=80',
        pickupStart: '08:00',
        pickupEnd: '14:00',
      },
      {
        id: 'club-sandwich',
        title: 'Club Sandwich',
        description: 'Sandwich gourmand garni de poulet, salade et tomates.',
        price: 10,
        originalPrice: 12,
        quantity: 6,
        category: 'restaurant',
        imageUrl: 'https://images.unsplash.com/photo-1567234669003-dce7a7a88821?auto=format&fit=crop&w=800&q=80',
        pickupStart: '11:00',
        pickupEnd: '17:00',
      },
      {
        id: 'french-toast',
        title: 'French Toast',
        description: 'Pain perdu doré et moelleux, accompagné d’une touche sucrée.',
        price: 8,
        originalPrice: 10,
        quantity: 7,
        category: 'patisserie',
        imageUrl: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=800&q=80',
        pickupStart: '09:00',
        pickupEnd: '16:00',
      },
      {
        id: 'granola-bowl',
        title: 'Granola Bowl',
        description: 'Bol gourmand de granola accompagné de fruits frais.',
        price: 7,
        originalPrice: 9,
        quantity: 6,
        category: 'restaurant',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxgABo0yKPkBGLbQtKo9L6LIP85bPokCIftSOyk0CQ0SLugCVRtg4MEU4&s=10',
        pickupStart: '08:00',
        pickupEnd: '15:00',
      },
      {
        id: 'jus-orange',
        title: 'Jus d’orange frais',
        description: 'Jus d’orange fraîchement pressé.',
        price: 4,
        originalPrice: 5,
        quantity: 10,
        category: 'cafeteria',
        imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=80',
        pickupStart: '08:00',
        pickupEnd: '17:00',
      },
      {
        id: 'iced-latte',
        title: 'Iced Latte',
        description: 'Café glacé au lait, idéal pour accompagner un brunch.',
        price: 5,
        originalPrice: 6,
        quantity: 8,
        category: 'cafeteria',
        imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80',
        pickupStart: '09:00',
        pickupEnd: '17:00',
      },
    ],

    surpriseBaskets: [
      {
        id: 'brunch-sucre',
        title: 'Panier Brunch Sucré',
        description: 'Un assortiment surprise de pancakes, douceurs et boisson.',
        originalPrice: 14,
        discountedPrice: 8,
        quantity: 6,
        category: 'restaurant',
        imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=800&q=80',
        pickupStart: '10:00',
        pickupEnd: '14:00',
      },
      {
        id: 'brunch-sale',
        title: 'Panier Brunch Salé',
        description: 'Un assortiment surprise de préparations salées et de boisson.',
        originalPrice: 16,
        discountedPrice: 9,
        quantity: 6,
        category: 'restaurant',
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
        pickupStart: '11:00',
        pickupEnd: '15:00',
      },
    ],
  },

  // ==========================================
  // COMMERÇANT 4 : MALFOUF DEVANT ESSECT
  // ==========================================
  {
    uid: 'seed_malfouf_essect_001',
    businessName: 'Malfouf devant ESSECT',
    description: 'Vendeur de Malfouf situé devant l’entrée principale de l’ESSECT.',
    address: 'Devant l’entrée principale de l’ESSECT, Tunis',
    category: 'restaurant',
    latitude: 36.7871383,
    longitude: 10.1745793,

    offers: [
      {
        id: 'malfouf-thon',
        title: 'Malfouf au thon',
        description: 'Malfouf traditionnel garni de thon et de légumes.',
        price: 4,
        originalPrice: 5,
        quantity: 10,
        category: 'restaurant',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnhVQyMbvdc48NIHGJ5VAOUNTcw4IQHwAtXMm_8_Zs_A&s=10',
        pickupStart: '10:00',
        pickupEnd: '16:00',
      },
      {
        id: 'malfouf-escalope',
        title: 'Malfouf escalope',
        description: 'Malfouf garni d’escalope et de légumes.',
        price: 5,
        originalPrice: 6,
        quantity: 8,
        category: 'restaurant',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ4uaz8vEFJ2mpA5_77xN-2hdYSHr1xEvtZW1NFS3LzzzcYMeEU99JlBlM&s=10',
        pickupStart: '10:00',
        pickupEnd: '16:00',
      },
      {
        id: 'malfouf-jambon-fromage',
        title: 'Malfouf jambon-fromage',
        description: 'Malfouf gourmand garni de jambon et de fromage.',
        price: 4.5,
        originalPrice: 5.5,
        quantity: 8,
        category: 'restaurant',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-4_PPejAeEcbCovOwrfs9kiytL9wNgT_0lOhvJulY2bH_S8ZG8b05qU4&s=10',
        pickupStart: '10:00',
        pickupEnd: '16:00',
      },
      {
        id: 'malfouf-fromage',
        title: 'Malfouf fromage',
        description: 'Malfouf chaud garni de fromage fondant.',
        price: 3.5,
        originalPrice: 4.5,
        quantity: 10,
        category: 'restaurant',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7k6u0wtjztxDoT8Ms6mUKgYL5rJKWjkQfBxFEYo9ZFA&s=10',
        pickupStart: '10:00',
        pickupEnd: '16:00',
      },
    ],

    surpriseBaskets: [
      {
        id: 'malfouf-mixte',
        title: 'Panier Malfouf Mixte',
        description: 'Un assortiment surprise de malfouf au thon et au fromage.',
        originalPrice: 9,
        discountedPrice: 5.5,
        quantity: 8,
        category: 'restaurant',
        imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
        pickupStart: '12:00',
        pickupEnd: '16:00',
      },
      {
        id: 'malfouf-gourmand',
        title: 'Panier Malfouf Gourmand',
        description: 'Un assortiment surprise de malfouf et de préparations salées.',
        originalPrice: 12,
        discountedPrice: 7,
        quantity: 6,
        category: 'restaurant',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7k6u0wtjztxDoT8Ms6mUKgYL5rJKWjkQfBxFEYo9ZFA&s=10',
        pickupStart: '12:00',
        pickupEnd: '16:00',
      },
    ],
  },
];

// ==========================================
// IMPORTATION ET SYNCHRONISATION SÉCURISÉE
// ==========================================

const importData = async () => {
  const plannedDocuments = [];

  for (const merchant of DEMO_MERCHANTS) {
    const {
      latitude,
      longitude,
      offers,
      surpriseBaskets,
      ...merchantFields
    } = merchant;

    const merchantRef = db.collection('merchants').doc(merchant.uid);

    plannedDocuments.push({
      ref: merchantRef,
      label: `Commerçant ${merchant.businessName}`,
      type: 'merchant',
      data: {
        ...merchantFields,
        uid: merchant.uid,
        approvalStatus: 'approved',
        location: new GeoPoint(latitude, longitude),
        demoSeed: true,
      },
    });

    // Préparer les offres classiques
    for (const offer of offers || []) {
      const { id, ...offerFields } = offer;

      const offerRef = db.collection('offers').doc(
        `${merchant.uid}_${id}`
      );

      plannedDocuments.push({
        ref: offerRef,
        label: `Offre ${offer.title}`,
        type: 'offer',
        data: {
          ...offerFields,
          merchantId: merchant.uid,
          businessName: merchant.businessName,
          status: 'approved',
          isAvailable: offer.quantity > 0,
          demoSeed: true,
        },
      });
    }

    // Préparer les paniers surprises
    for (const basket of surpriseBaskets || []) {
      const { id, ...basketFields } = basket;

      const basketRef = db.collection('surpriseBaskets').doc(
        `${merchant.uid}_${id}`
      );

      plannedDocuments.push({
        ref: basketRef,
        label: `Panier surprise ${basket.title}`,
        type: 'basket',
        data: {
          ...basketFields,
          merchantId: merchant.uid,
          businessName: merchant.businessName,
          remainingQuantity: basket.quantity,
          status: 'active',
          demoSeed: true,
        },
      });
    }
  }

  // Vérifier tous les documents avant toute écriture
  const existingDocuments = await Promise.all(
    plannedDocuments.map(async (item) => ({
      ...item,
      snapshot: await item.ref.get(),
    }))
  );

  // Protéger les données réelles
  for (const item of existingDocuments) {
    if (
      item.snapshot.exists &&
      item.snapshot.data().demoSeed !== true
    ) {
      throw new Error(
        `${item.label} : identifiant déjà utilisé par une donnée réelle. Aucune écriture effectuée.`
      );
    }
  }

  const batch = db.batch();

  let createdCount = 0;
  let updatedCount = 0;

  // Créer ou mettre à jour les documents
  for (const item of existingDocuments) {
    if (!item.snapshot.exists) {
      batch.create(item.ref, {
        ...item.data,
        createdAt: FieldValue.serverTimestamp(),
      });

      createdCount++;
      continue;
    }

    const existingData = item.snapshot.data();

    const updatedData = {
      ...item.data,
      createdAt: existingData.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Préserver le stock des offres classiques
    if (item.type === 'offer') {
      updatedData.quantity =
        existingData.quantity ?? item.data.quantity;

      updatedData.isAvailable =
        existingData.isAvailable ?? item.data.isAvailable;
    }

    // Préserver le stock et les réservations des paniers surprises
    if (item.type === 'basket') {
      updatedData.quantity =
        existingData.quantity ?? item.data.quantity;

      updatedData.remainingQuantity =
        existingData.remainingQuantity ?? item.data.remainingQuantity;
    }

    batch.update(item.ref, updatedData);
    updatedCount++;
  }

  // Exécuter les écritures
  if (createdCount > 0 || updatedCount > 0) {
    await batch.commit();
  }

  // Afficher le bilan
  const totalOffers = DEMO_MERCHANTS.reduce(
    (total, merchant) => total + (merchant.offers || []).length,
    0
  );

  const totalBaskets = DEMO_MERCHANTS.reduce(
    (total, merchant) => total + (merchant.surpriseBaskets || []).length,
    0
  );

  console.log('======================================');
  console.log('Synchronisation terminée avec succès.');
  console.log('======================================');
  console.log(`Commerçants configurés : ${DEMO_MERCHANTS.length}`);
  console.log(`Offres classiques : ${totalOffers}`);
  console.log(`Paniers surprises : ${totalBaskets}`);
  console.log(`Documents vérifiés : ${existingDocuments.length}`);
  console.log(`Nouveaux documents : ${createdCount}`);
  console.log(`Documents mis à jour : ${updatedCount}`);

  for (const merchant of DEMO_MERCHANTS) {
    console.log(
      `${merchant.businessName} : ${(merchant.offers || []).length} offres et ${(merchant.surpriseBaskets || []).length} paniers surprises`
    );
  }
};

importData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erreur pendant l’importation :', error);
    process.exit(1);
  });
