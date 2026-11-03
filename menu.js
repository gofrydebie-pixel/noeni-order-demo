/*
 * The menu. Prices and "sold out" can be overridden from the Google Sheet
 * (tab "Menu"), so day-to-day changes don't need an edit here.
 * Variant ids must match the "Menu" tab in the Sheet.
 */
(function () {
  const MAIN_SIZES = [
    { id: 'm', label: { nl: 'Medium', fr: 'Moyen', en: 'Medium' }, size: '650 ml', price: 14 },
    { id: 'l', label: { nl: 'Groot', fr: 'Grand', en: 'Large' }, size: '1000 ml', price: 17 },
  ];
  // Each dish gets its own copy, so a price or sold-out change hits one dish only.
  const main = () => MAIN_SIZES.map((v) => ({ ...v }));
  const one = (price, size) => [{ id: 'x', label: { nl: '', fr: '', en: '' }, size, price }];

  window.NTK_CATEGORIES = [
    { id: 'mains', label: { nl: 'Hoofdgerechten', fr: 'Plats', en: 'Mains' } },
    { id: 'soups', label: { nl: 'Soepen', fr: 'Soupes', en: 'Soups' } },
    { id: 'rolls', label: { nl: 'Loempia’s', fr: 'Rouleaux', en: 'Spring rolls' } },
    { id: 'extras', label: { nl: 'Extra’s', fr: 'Extras', en: 'Extras' } },
    { id: 'desserts', label: { nl: 'Desserts', fr: 'Desserts', en: 'Desserts' } },
  ];

  window.NTK_MENU = [
    {
      id: 'padthai', cat: 'mains', name: 'Pad Thai', img: 'padthai.jpg', variants: main(),
      sub: { nl: 'Rijstnoedels uit de wok met tamarinde', fr: 'Nouilles de riz sautées au tamarin', en: 'Wok-fried rice noodles with tamarind' },
      ing: {
        nl: 'rijstnoedel – tomaat – tamarinde – rode ui – sojasaus – spitskool – wortel – courgette – sojascheuten – tofu · garnituur: pinda en lente-ui',
        fr: 'nouilles de riz – tomate – tamarin – oignon rouge – sauce soja – chou pointu – carotte – courgette – pousses de soja – tofu · garniture : cacahuète et oignon nouveau',
        en: 'rice noodles – tomato – tamarind – red onion – soy sauce – pointed cabbage – carrot – courgette – bean sprouts – tofu · garnish: peanut and spring onion',
      },
    },
    {
      id: 'zoetzuur', cat: 'mains', name: { nl: 'Zoetzure Wok', fr: 'Wok aigre-doux', en: 'Sweet & Sour Wok' }, img: 'zoetzuur.jpg', variants: main(),
      sub: { nl: 'Met vegan kip, ananas en cashewnoten', fr: 'Au poulet vegan, ananas et noix de cajou', en: 'With vegan chicken, pineapple and cashews' },
      ing: {
        nl: 'bruine jasmijnrijst – ui – paprika rood en geel – courgette – knoflook – vegan kip – ananas – tomaat – cashewnoten',
        fr: 'riz jasmin complet – oignon – poivron rouge et jaune – courgette – ail – poulet vegan – ananas – tomate – noix de cajou',
        en: 'brown jasmine rice – onion – red and yellow pepper – courgette – garlic – vegan chicken – pineapple – tomato – cashews',
      },
    },
    {
      id: 'kanomjeen', cat: 'mains', name: 'Kanom Jeen Nam Ya', img: 'kanomjeen.jpg', variants: main(), spicy: true,
      sub: { nl: 'Noedels met paddenstoelensaus', fr: 'Nouilles à la sauce aux champignons', en: 'Noodles with mushroom curry sauce' },
      ing: {
        nl: 'rijstnoedel – champignons – oesterzwam – rode ui – kruidenpasta – kokosmelk · garnituur: bergamot en lente-ui',
        fr: 'nouilles de riz – champignons – pleurotes – oignon rouge – pâte de curry – lait de coco · garniture : feuille de combava et oignon nouveau',
        en: 'rice noodles – mushrooms – oyster mushrooms – red onion – curry paste – coconut milk · garnish: makrut lime leaf and spring onion',
      },
    },
    {
      id: 'khaosoy', cat: 'mains', name: 'Khao Soy', img: 'khaosoy.jpg', variants: main(), spicy: true,
      sub: { nl: 'Noord-Thaise currynoedels', fr: 'Nouilles au curry du nord de la Thaïlande', en: 'Northern Thai curry noodles' },
      ing: {
        nl: 'gele tarwenoedels – currypasta – champignon – tofu · garnituur: gepekelde groenten, sjalot, limoen',
        fr: 'nouilles de blé jaunes – pâte de curry – champignons – tofu · garniture : légumes marinés, échalote, citron vert',
        en: 'yellow wheat noodles – curry paste – mushroom – tofu · garnish: pickled greens, shallot, lime',
      },
    },
    {
      id: 'panang', cat: 'mains', name: 'Panang Curry', img: 'panang.jpg', variants: main(), spicy: true,
      sub: { nl: 'Romige curry met vegan kip', fr: 'Curry crémeux au poulet vegan', en: 'Creamy curry with vegan chicken' },
      ing: {
        nl: 'bruine jasmijnrijst – champignons – vegan kip – panang kruidenpasta – kokosmelk · garnituur: bergamot en rode chili',
        fr: 'riz jasmin complet – champignons – poulet vegan – pâte de curry panang – lait de coco · garniture : feuille de combava et piment rouge',
        en: 'brown jasmine rice – mushrooms – vegan chicken – panang curry paste – coconut milk · garnish: makrut lime leaf and red chilli',
      },
    },
    {
      id: 'massaman', cat: 'mains', name: 'Massaman Curry', img: 'massaman.jpg', variants: main(), spicy: true,
      sub: { nl: 'Curry met aardappel en kikkererwten', fr: 'Curry aux pommes de terre et pois chiches', en: 'Curry with potato and chickpeas' },
      ing: {
        nl: 'bruine jasmijnrijst – ui – wortel – aardappel – kikkererwt – sojabrokken – massaman kruidenpasta – kokosmelk · garnituur: bergamot en rode chili',
        fr: 'riz jasmin complet – oignon – carotte – pomme de terre – pois chiche – morceaux de soja – pâte de curry massaman – lait de coco · garniture : feuille de combava et piment rouge',
        en: 'brown jasmine rice – onion – carrot – potato – chickpea – soy chunks – massaman curry paste – coconut milk · garnish: makrut lime leaf and red chilli',
      },
    },
    {
      id: 'guaytiao', cat: 'mains', name: 'Guay Tiao', img: 'guaytiao.jpg', variants: main(),
      sub: { nl: 'Noedelsoep met vegan gehaktballetjes', fr: 'Soupe de nouilles aux boulettes vegan', en: 'Noodle soup with vegan meatballs' },
      ing: {
        nl: 'udonnoedels – ui – tomaat – champignon – broccoli – sojascheut – vegan gehaktballetjes · garnituur: lente-ui',
        fr: 'nouilles udon – oignon – tomate – champignon – brocoli – pousses de soja – boulettes vegan · garniture : oignon nouveau',
        en: 'udon noodles – onion – tomato – mushroom – broccoli – bean sprouts – vegan meatballs · garnish: spring onion',
      },
    },
    {
      id: 'pho', cat: 'mains', name: 'Pho', img: 'pho.jpg', variants: main(),
      sub: { nl: 'Vietnamese noedelsoep', fr: 'Soupe de nouilles vietnamienne', en: 'Vietnamese noodle soup' },
      ing: {
        nl: 'rijstnoedels – tofu – enoki – suikererwt – sojascheut – Chinese kool – wortel · garnituur: verse koriander',
        fr: 'nouilles de riz – tofu – enoki – pois mange-tout – pousses de soja – chou chinois – carotte · garniture : coriandre fraîche',
        en: 'rice noodles – tofu – enoki – snow peas – bean sprouts – Chinese cabbage – carrot · garnish: fresh coriander',
      },
    },
    {
      id: 'tomyam', cat: 'soups', name: 'Tom Yam', img: 'tomyam.jpg', spicy: true, variants: one(7.5, '650 ml'),
      sub: { nl: 'Pikante Thaise soep met paddenstoelen', fr: 'Soupe thaïe épicée aux champignons', en: 'Spicy Thai soup with mushrooms' },
      ing: {
        nl: 'tom yam pasta – oesterzwam – champignon – enoki – tomaat – spitskool – wortel – kokosmelk – bergamot · garnituur: lente-ui',
        fr: 'pâte tom yam – pleurotes – champignons – enoki – tomate – chou pointu – carotte – lait de coco – feuille de combava · garniture : oignon nouveau',
        en: 'tom yam paste – oyster mushroom – mushroom – enoki – tomato – pointed cabbage – carrot – coconut milk – makrut lime leaf · garnish: spring onion',
      },
    },
    {
      id: 'tomkha', cat: 'soups', name: 'Tom Kha', img: 'tomkha.jpg', spicy: true, variants: one(7.5, '650 ml'),
      sub: { nl: 'Thaise kokossoep met paddenstoelen', fr: 'Soupe thaïe au lait de coco et champignons', en: 'Thai coconut soup with mushrooms' },
      ing: {
        nl: 'tom kha pasta – oesterzwam – champignon – enoki – tomaat – spitskool – wortel – courgette – kokosmelk – bergamot · garnituur: lente-ui',
        fr: 'pâte tom kha – pleurotes – champignons – enoki – tomate – chou pointu – carotte – courgette – lait de coco – feuille de combava · garniture : oignon nouveau',
        en: 'tom kha paste – oyster mushroom – mushroom – enoki – tomato – pointed cabbage – carrot – courgette – coconut milk – makrut lime leaf · garnish: spring onion',
      },
    },
    {
      id: 'verseloempia', cat: 'rolls', name: { nl: 'Verse loempia', fr: 'Rouleaux de printemps frais', en: 'Fresh spring rolls' }, img: 'verseloempia.jpg', variants: one(8, '3 st.'),
      sub: { nl: 'Rijstpapierrolletjes met zoete chilisaus', fr: 'Rouleaux de galette de riz, sauce chili douce', en: 'Rice paper rolls with sweet chilli sauce' },
      ing: {
        nl: 'rijstpapier – glasnoedel – tofu – munt – komkommer – wortel – koriander – pinda – zoete chilisaus',
        fr: 'galette de riz – vermicelles de soja – tofu – menthe – concombre – carotte – coriandre – cacahuète – sauce chili douce',
        en: 'rice paper – glass noodles – tofu – mint – cucumber – carrot – coriander – peanut – sweet chilli sauce',
      },
    },
    {
      id: 'loempia', cat: 'rolls', name: { nl: 'Loempia (diepvries)', fr: 'Nems (surgelés)', en: 'Spring rolls (frozen)' }, img: 'loempia.jpg', variants: one(12, '7 st.'), frozen: true,
      sub: { nl: 'Diepgevroren geleverd: frituren, bakken of airfryer', fr: 'Livrés surgelés : friteuse, poêle ou airfryer', en: 'Delivered frozen: deep-fry, pan-fry or air-fry' },
      ing: {
        nl: 'tarwe – glasnoedel – shiitake – tofu – spitskool – prei – wortel',
        fr: 'blé – vermicelles de soja – shiitake – tofu – chou pointu – poireau – carotte',
        en: 'wheat – glass noodles – shiitake – tofu – pointed cabbage – leek – carrot',
      },
    },
    {
      id: 'kimchi', cat: 'extras', name: 'Kimchi', img: 'kimchi.jpg', spicy: true, variants: one(5, '350 ml'),
      sub: { nl: 'Gefermenteerde groenten', fr: 'Légumes fermentés', en: 'Fermented vegetables' },
      ing: {
        nl: 'wortel – witte raap – Chinese kool – lente-ui – ui – knoflook – rode chili – suiker – ferment van plakrijst',
        fr: 'carotte – navet blanc – chou chinois – oignon nouveau – oignon – ail – piment rouge – sucre – riz gluant fermenté',
        en: 'carrot – white radish – Chinese cabbage – spring onion – onion – garlic – red chilli – sugar – fermented glutinous rice',
      },
    },
    {
      id: 'rodekool', cat: 'extras', name: { nl: 'Gepekelde rode kool', fr: 'Chou rouge mariné', en: 'Pickled red cabbage' }, img: 'rodekool.jpg', variants: one(4, '350 ml'),
      sub: { nl: 'Zoetzuur ingelegd', fr: 'Mariné aigre-doux', en: 'Sweet and sour pickle' },
      ing: {
        nl: 'rode kool – knoflook – azijn – suiker – zout',
        fr: 'chou rouge – ail – vinaigre – sucre – sel',
        en: 'red cabbage – garlic – vinegar – sugar – salt',
      },
    },
    {
      id: 'looksaus', cat: 'extras', name: { nl: 'Loving Hut looksaus', fr: 'Sauce à l’ail Loving Hut', en: 'Loving Hut garlic sauce' }, img: null,
      variants: [
        { id: 'gewoon', label: { nl: 'Gewoon', fr: 'Nature', en: 'Regular' }, size: '300 ml', price: 4 },
        { id: 'pikant', label: { nl: '(Mild) pikant', fr: '(Légèrement) piquante', en: '(Mildly) spicy' }, size: '300 ml', price: 4 },
      ],
      sub: { nl: 'Tip: met Boni-gyros van Colruyt maak je er zelf een gyroswrap mee', fr: 'Astuce : avec le gyros Boni de Colruyt, faites vous-même un wrap gyros', en: 'Tip: pair it with Boni gyros from Colruyt for a homemade gyros wrap' },
      ing: {
        nl: 'sojamelk – knoflook – mosterd – zonnebloemolie – suiker – zout – azijn (pikant: + chilisaus)',
        fr: 'lait de soja – ail – moutarde – huile de tournesol – sucre – sel – vinaigre (piquante : + sauce chili)',
        en: 'soy milk – garlic – mustard – sunflower oil – sugar – salt – vinegar (spicy: + chilli sauce)',
      },
    },
    {
      id: 'portie', cat: 'extras', name: { nl: 'Extra portie rijst of noedels', fr: 'Portion de riz ou nouilles', en: 'Extra rice or noodles' }, img: null,
      variants: [
        { id: 'rijst', label: { nl: 'Bruine jasmijnrijst', fr: 'Riz jasmin complet', en: 'Brown jasmine rice' }, size: '350 ml', price: 2 },
        { id: 'vermicelli', label: { nl: 'Rijstvermicelli', fr: 'Vermicelles de riz', en: 'Rice vermicelli' }, size: '350 ml', price: 2 },
        { id: 'udon', label: { nl: 'Udon', fr: 'Udon', en: 'Udon' }, size: '350 ml', price: 2 },
      ],
      sub: { nl: 'Handig bij een soep of om te delen', fr: 'Pratique avec une soupe ou à partager', en: 'Handy with a soup or for sharing' },
      ing: { nl: '', fr: '', en: '' },
    },
    {
      id: 'kanomchan', cat: 'desserts', name: 'Kanom Chan', img: 'kanomchan.jpg', variants: one(6, '4 st.'),
      sub: { nl: 'Gestoomde laagjescake met pandan', fr: 'Gâteau à étages vapeur au pandan', en: 'Steamed layer cake with pandan' },
      ing: {
        nl: 'rijstmeel – tapioca – pandanblad – kokosmelk – suiker',
        fr: 'farine de riz – tapioca – feuille de pandan – lait de coco – sucre',
        en: 'rice flour – tapioca – pandan leaf – coconut milk – sugar',
      },
    },
    {
      id: 'tiramisu', cat: 'desserts', name: 'Tiramisu', img: 'tiramisu.jpg', variants: one(6, ''),
      sub: { nl: 'Met speculaas', fr: 'Aux spéculoos', en: 'With speculoos' },
      ing: {
        nl: 'speculaas en koekjes – vegan mascarpone en slagroom – koffie – chocoladesaus',
        fr: 'spéculoos et biscuits – mascarpone et chantilly végétaux – café – sauce chocolat',
        en: 'speculoos and biscuits – vegan mascarpone and whipped cream – coffee – chocolate sauce',
      },
    },
    {
      id: 'muffin', cat: 'desserts', name: { nl: 'Chocolademuffin', fr: 'Muffin au chocolat', en: 'Chocolate muffin' }, img: 'muffin.jpg', variants: one(3, ''),
      sub: { nl: 'Zacht en chocoladig', fr: 'Moelleux et chocolaté', en: 'Soft and chocolatey' },
      ing: {
        nl: 'tarwebloem – sojamelk – rietsuiker – bakpoeder – cacao',
        fr: 'farine de blé – lait de soja – sucre de canne – levure chimique – cacao',
        en: 'wheat flour – soy milk – cane sugar – baking powder – cocoa',
      },
    },
  ];
})();
