/* =====================================================================
   BOXED — CATÁLOGO DE PRODUCTOS
   La web y el servidor leen de aquí. Si cambias un precio, cámbialo AQUÍ.

   - prices: precio en cada moneda (USD y EUR).
   - colors: colores disponibles. Cada color tiene sus fotos.
   - PRINTIFY: el ID de cada producto en Printify (arriba, en la lista).
   - gelatoId: el ID del producto en Gelato (solo si usas Gelato).
   - printFiles: URL pública del diseño (PNG grande, fondo transparente).
   ===================================================================== */
(function () {
  var SIZES = ["S", "M", "L", "XL", "XXL"];
  var WHITE = { name: "White", hex: "#FFFFFF" }, BLACK = { name: "Black", hex: "#0B0B0B" };

  // ID de cada producto en Printify (tienda de API 29070771)
  var PRINTIFY = {
    "gothic-boxed-ls": "6abf935dae43f99c750ba2a5",
    "la-breeze-boxed-ls": "6abf9100361ea1da1f038941",
    "signature-boxed-ls": "6abf939017f3ce148405dc66",
    "dream-theory-boxed-ls": "6abf9625d156dc207700a979",
    "faith-boxed-ls": "6abf951eae43f99c750ba395",
    "cross-boxed-ls": "6abf9a9975c1285cd80cc836",
    "star-boxed-ls": "6abf9bb363b245dbdb040445",
    "atl-boxed-ls": "6abf9d8e60c6f14afc0896f5",
    "deception-boxed-ls": "6abf9f5660c6f14afc0898bb",
    "bubble-boxed-ls": "6abfa3df639021746100ebae",
    "icon-boxed-ls": "6abe98e8f848bb7cfe017384",
    "bones-boxed-ls": "6abe9e6634a5a6133d04ac8f",
    "error-boxed-ls": "6abe9b9f98083007210bf99b"
  };

  function P(id, name, color, desc, extra) {
    var p = {
      id: id, name: name, type: "longsleeve", gelatoId: "", printifyId: PRINTIFY[id] || "",
      prices: { USD: 39.99, EUR: 39.99 },
      colors: [{ name: color.name, hex: color.hex, images: ["img/" + id + "-1.jpg", "img/" + id + "-2.jpg"] }],
      desc: desc
    };
    for (var k in (extra || {})) p[k] = extra[k];
    return p;
  }

  var PRODUCTS = [
    P("gothic-boxed-ls", "Gothic Boxed Long Sleeve", BLACK, "Manga larga negra con BOXED en letra gótica en el pecho y ornamentos góticos en las dos mangas."),
    P("la-breeze-boxed-ls", "LA Breeze Boxed Long Sleeve", WHITE, "Manga larga blanca con BOXED Los Angeles delante y \"Vintage tee, the 405, the breeze on\" en la espalda."),
    P("signature-boxed-ls", "Signature Boxed Long Sleeve", WHITE, "Manga larga blanca con BXD y BOXED delante y la firma en grande en la espalda: \"youth is the time to be bold\"."),
    P("dream-theory-boxed-ls", "Dream Theory Boxed Long Sleeve", BLACK, "Manga larga negra con el logo en azul delante y \"If you can dream it you can do it\" en la espalda."),
    P("faith-boxed-ls", "Faith Boxed Long Sleeve", WHITE, "Manga larga blanca con BOXED en azul delante y \"fact of god\" en grande en la espalda."),
    P("cross-boxed-ls", "Cross Boxed Long Sleeve", BLACK, "Manga larga negra con BOXED en beige delante y cruces en las mangas."),
    P("star-boxed-ls", "Star Boxed Long Sleeve", WHITE, "Manga larga blanca con la estrella roja en el pecho y \"Need a hug from a bad girl\" en la espalda."),
    P("atl-boxed-ls", "ATL Boxed Long Sleeve", WHITE, "Manga larga blanca con la firma Boxed delante y Boxed Atlanta en la espalda."),
    P("deception-boxed-ls", "Deception Boxed Long Sleeve", WHITE, "Manga larga blanca con Boxed Deception en caligrafía, estrellas y salpicaduras rojas."),
    P("bubble-boxed-ls", "Bubble Boxed Long Sleeve", BLACK, "Manga larga negra con Boxed en burbuja rosa delante y \"Don't be Boxed\" en la espalda."),
    P("icon-boxed-ls", "Icon Boxed Long Sleeve", WHITE, "Manga larga blanca con la B cromada en el pecho, la B en spray con goteo en la espalda y BOXED en la manga."),
    P("error-boxed-ls", "Error Boxed Long Sleeve", WHITE, "Manga larga blanca con el 404 No One Response en beige delante y el mensaje completo en la espalda."),
    P("bones-boxed-ls", "Bones Boxed Long Sleeve", BLACK, "Manga larga negra con el esqueleto completo: costillas delante, columna detrás y huesos en las mangas.")
  ];

  PRODUCTS.forEach(function (p) {
    p.sizes = p.sizes || SIZES.slice();
    p.gelato = p.gelato || {};
    p.printFiles = p.printFiles || { front: "", back: "" };
    p.images = p.colors[0].images;          // compatibilidad
    p.price = p.prices.USD;                 // compatibilidad
  });

  var CONFIG = {
    currencies: {
      USD: { symbol: "$", locale: "en-US", shipping: 4.95, freeShippingFrom: 60 },
      EUR: { symbol: "€", locale: "es-ES", shipping: 4.95, freeShippingFrom: 60 }
    },
    defaultCurrency: "USD",
    // compatibilidad con el servidor
    currency: "USD", shipping: 4.95, freeShippingFrom: 60,
    paypalEmail: "davdoga2012@gmail.com",
    owner: "David Domínguez García",
    email: "davdoga2012@gmail.com",
    phone: "+34 608 44 39 64"
  };

  var CATALOG = { products: PRODUCTS, config: CONFIG };
  if (typeof module !== "undefined" && module.exports) module.exports = CATALOG;
  if (typeof window !== "undefined") window.N1X = CATALOG;
})();
