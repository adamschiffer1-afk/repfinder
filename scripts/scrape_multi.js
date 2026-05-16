const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// KONFIGURACJA MONGO
const MONGODB_URI = process.env.MONGODB_URI;
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: Number,
  category: String,
  link: String,
  image: String,
  batch: String,
  createdAt: { type: Date, default: Date.now },
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const AFFILIATE_CODE = 'xfrostyy';

// TWOJA LISTA LINKÓW
const INPUT_LINKS = [
  { id: '7511943850', name: 'Stone Island hat' },
  { id: '7506424493', name: 'Essentials Hoodie' },
  { id: '7509470028', name: 'Stussy Bag' },
  { id: '7510039941', name: 'Yeezy foam' },
  { id: '7511880936', name: 'Corteiz T-shirt' },
  { id: '7512747285', name: 'Gucci Bag' },
  { id: '7512780789', name: 'Denim Tears T-shirts' },
  { id: '7509543359', name: 'New balance 9060' },
  { id: '7509103418', name: 'Colebuxton shorts' },
  { id: '7505783971', name: 'Stone Island Hat' },
  { id: '7512272719', name: 'Lv Bag' },
  { id: '7508205827', name: 'Apple Pencil' },
  { id: '7509158120', name: 'Under Armour T-shirt' },
  { id: '7512575826', name: 'Bape Hoodie' },
  { id: '7506395467', name: 'Ralph Lauren Sweater' },
  { id: '7512524612', name: 'KITH' },
  { id: '7511880932', name: 'Givenchy Belt' },
  { id: '7506880357', name: 'CP Knitted Hat' },
  { id: '7514129054', name: 'Dior Jeans' },
  { id: '7511479434', name: 'Dior Belt' },
  { id: '7514625440', name: 'Corteiz balaclava' },
  { id: '7651106996', name: 'Stussy Hoodie' },
  { id: '7512798651', name: 'Cartier Necklaces' },
  { id: '7510781920', name: 'Essentials Shorts' },
  { id: '7508127135', name: 'The North FACE Bag' },
  { id: '7512204337', name: 'Stone Island jeans' },
  { id: '7512729381', name: 'Stone Island hat' },
  { id: '7508285438', name: 'Ralph Lauren Hoodie' },
  { id: '7511821407', name: 'Nike air max 97' },
  { id: '7512514732', name: 'Denim Tears Pants' },
  { id: '7510036001', name: 'LV keychain' },
  { id: '7509717615', name: 'Batterypack 5000Ahm' },
  { id: '7508174519', name: 'Nike dunk' },
  { id: '7648211681', name: 'Supreme Pants' },
  { id: '7509113350', name: 'Eric Emanuel Shorts' },
  { id: '7513752524', name: 'Stussy Hoodie' },
  { id: '7510034021', name: 'Air Force 1' },
  { id: '7513215016', name: 'Cartier Glasses' },
  { id: '7506413157', name: 'Nocta Hotstep 2' },
  { id: '7508076822', name: 'Carhartt T-shirt' },
  { id: '7511340637', name: 'Stone Island T-shirt' },
  { id: '7648111277', name: 'CDG Play Heart T-shirt' },
  { id: '7534285731', name: 'Corteiz Pants' },
  { id: '7509979471', name: 'Hellstar Hoodie' },
  { id: '7506834965', name: 'Ralph Lauren Hoodie' },
  { id: '7505702939', name: 'Maison Margiela T-shirt' },
  { id: '7509181842', name: 'Trapstar Pants' },
  { id: '7507571344', name: 'Syna World Suit' },
  { id: '7506391497', name: 'Stone Island T-shirt' },
  { id: '7508937295', name: 'Lv slide' },
  { id: '7508719014', name: 'Denim Tears Shorts' },
  { id: '7511362113', name: 'Burberry Glasses' },
  { id: '7511497311', name: 'Syna World Pants' },
  { id: '7508293334', name: 'Stussy Shorts' },
  { id: '7509627301', name: 'Broken Planet T-shirt' },
  { id: '7511377931', name: 'Miami Bape Shorts' },
  { id: '7514619478', name: 'Burberry Shorts' },
  { id: '7513301602', name: 'Airpods 2' },
  { id: '7511538564', name: 'Versace Sunglasses' },
  { id: '7513185190', name: 'DIESEL hat' },
  { id: '7511915899', name: 'Stone Island hoodie' },
  { id: '7511817339', name: 'Nike Nocta Tech' },
  { id: '7507485569', name: 'New balance 2002R' },
  { id: '7508277498', name: 'Chrome Hearts Hat' },
  { id: '7512262863', name: 'Lv Bag' },
  { id: '7507262869', name: 'Gallery Dept Hoodie' },
  { id: '7648105423', name: 'PS5 Pad' },
  { id: '7730372182', name: 'Lv Skate [FOSHAN BATCH]' },
  { id: '7508332148', name: 'Off-White Sweatshirt' },
  { id: '7514208160', name: 'Nike air max plus' },
  { id: '7510815314', name: 'Ralph Lauren shorts' },
  { id: '7651171746', name: 'Iphone 17 Case' },
  { id: '7509505704', name: 'Jordan 312' },
  { id: '7505750385', name: 'Dior x Stone Island Hoodie' },
  { id: '7512778877', name: 'Stussy T-shirt' },
  { id: '7503990983', name: 'Samsung s25' },
  { id: '7508348044', name: 'AMI polo' },
  { id: '7509973596', name: 'Nike Slide' },
  { id: '7507675914', name: 'Lv Bag' },
  { id: '7507505475', name: 'Goyard bag' },
  { id: '7510628779', name: 'Dior Glasses' },
  { id: '7512857037', name: 'Bape T-shirt' },
  { id: '7512408158', name: 'Lv trainer [FOSHAN BATCH]' },
  { id: '7506456063', name: 'Lanvin [FOSHAN BATCH]' },
  { id: '7512244739', name: 'LV Bag' },
  { id: '7651164118', name: 'Dior B33' },
  { id: '7506825135', name: 'Chanel Hat' },
  { id: '7513456381', name: 'Hellstar T-shirt' },
  { id: '7507552461', name: 'LV Belt' },
  { id: '7505766319', name: 'New balance 610T' },
  { id: '7508947061', name: 'Jordan 13' },
  { id: '7514643114', name: 'Jordan Bag' },
  { id: '7513768390', name: 'Jordan 11' },
  { id: '7509450250', name: 'Spider T-shirt' },
  { id: '7507215391', name: 'LV Bracelet' },
  { id: '7509513652', name: 'LV Glasses' },
  { id: '7509695695', name: 'Stone Island shorts' },
  { id: '7506805425', name: 'Cartier Bracelet' },
  { id: '7510571257', name: 'Amiri Hoodie' },
  { id: '7512751159', name: 'Nike Shorts' },
  { id: '7506295548', name: 'Ralph Lauren Hat' },
  { id: '7512247087', name: 'patagonia hat' },
  { id: '7511941888', name: 'Nike tn' },
  { id: '7507582884', name: 'Balenciaga track' },
  { id: '7509507694', name: 'Prada Belt' },
  { id: '7513803902', name: 'Nike air max 90' },
  { id: '7511567928', name: 'Corteiz shorts' },
  { id: '7514123400', name: 'Loro Piana Hat' },
  { id: '7505738541', name: 'Ralph Lauren shorts' },
  { id: '7514198310', name: 'Moncler Hoodie' },
  { id: '7510689781', name: 'AMI Hoodie' },
  { id: '7509213644', name: 'Gallery Dept Pants' },
  { id: '7514684672', name: 'Adwysd Hoodie' },
  { id: '7510012337', name: 'JBLPulse6+' },
  { id: '7507685614', name: 'Nike T-shirt' },
  { id: '7512973202', name: 'Prada hat' },
  { id: '7512485596', name: 'Lv Bag' },
  { id: '7507573306', name: 'Jordan 4 [KX BATCH]' },
  { id: '7506403399', name: 'Dior B22' },
  { id: '7506397499', name: 'AMI Sweater' },
  { id: '7504425363', name: 'MLB Hat' },
  { id: '7510004541', name: 'New Balance 1000' },
  { id: '7508798100', name: 'Ralph Lauren Socks' },
  { id: '7514131120', name: 'Balenciaga Hat' },
  { id: '7509491826', name: 'Syna World Pants' },
  { id: '7506878419', name: 'Chrome Hearts Wallet' },
  { id: '7507315675', name: 'Prada Wallet' },
  { id: '7511865414', name: 'Corteiz T-shirt' },
  { id: '7511858916', name: 'Corteiz hoodie' },
  { id: '7511945772', name: 'Ralph Lauren Hat' },
  { id: '7509979469', name: 'Rayban Glasses' },
  { id: '7651150290', name: 'JBL Boombox3' },
  { id: '7513256062', name: 'Balenciaga Glasses' },
  { id: '7507667952', name: 'Syna World Shorts' },
  { id: '7508304776', name: 'ADWYSD T-shirt' },
  { id: '7512503074', name: 'Trapstar Suit' },
  { id: '7509150734', name: 'carhartt wallet' },
  { id: '7510091830', name: 'Ralph Lauren POLO' },
  { id: '7512237247', name: 'AMI Sweater' },
  { id: '7511900340', name: 'JBLPulse6' },
  { id: '7508778398', name: 'Gucci Bag' },
  { id: '7512235399', name: 'Gallery Dept Hat' },
  { id: '7509127142', name: 'Ralph Lauren POLO' },
  { id: '7507632444', name: 'Gallery Dept Hoodie' },
  { id: '7511813230', name: 'Nike Pants' },
  { id: '7507625673', name: 'Prada Bag' },
  { id: '7507627651', name: 'Apple charging head' },
  { id: '7510031018', name: 'Lv Bag' },
  { id: '7508137065', name: 'Ralph Lauren Sweater' },
  { id: '7509487890', name: 'Loewe Earring' },
  { id: '7509539345', name: 'Stone Island hat' },
  { id: '7511323037', name: 'Hellstar T-shirt' },
  { id: '7506860725', name: 'Essentials T-shirt' },
  { id: '7507541227', name: 'Sp5der T-shirt' },
  { id: '7507610688', name: 'Yeezy 350' },
  { id: '7512252999', name: 'Gucci Hat' },
  { id: '7509121240', name: 'Nike Shorts' },
  { id: '7512847727', name: 'Ralph Lauren short sleeve' },
  { id: '7510699731', name: 'Ralph Lauren POLO' },
  { id: '7512546132', name: 'Corteiz hat' },
  { id: '7507636388', name: 'Ralph Lauren Polo shirt' },
  { id: '7509391476', name: 'CP Hoodie' },
  { id: '7508083563', name: 'Ami T-shirt' },
  { id: '7511894067', name: 'Gallery Dept shorts' },
  { id: '7510595057', name: 'Burberry Hat' },
  { id: '7512727463', name: 'Burberry Shorts' },
  { id: '7508780332', name: 'LV Sweater' },
  { id: '7508300870', name: 'Trapstar t-shirt' },
  { id: '7510825146', name: 'Dior shorts' },
  { id: '7507246575', name: 'Valentino Belt' },
  { id: '7514150866', name: 'LV Belt' },
  { id: '7511937836', name: 'Ralph Lauren Pants' },
  { id: '7510803538', name: 'LV Hat' },
  { id: '7508385644', name: 'Chrome Hearts T-shirt' },
  { id: '7512784799', name: 'Cartier Ring' },
  { id: '7508719014', name: 'Denim Tears Shorts' },
  { id: '7510813414', name: 'Burberry T-shirt' },
  { id: '7514704424', name: 'Lacoste Hoodie' },
  { id: '7511925789', name: 'Crocs' },
  { id: '7509977411', name: 'Sp5der Pants' },
  { id: '7505704865', name: 'Hermes Belt' },
  { id: '7510054696', name: 'Ralph Lauren T-shirt' },
  { id: '7509059398', name: 'Bapesta' },
  { id: '7509187744', name: 'Ralph Lauren Sweater' },
  { id: '7515341140', name: 'Vlone T-shirt' },
  { id: '7509123172', name: 'Gucci Belt' },
  { id: '7511575804', name: 'Ih Nom Uh Nit T-shirt' },
  { id: '7512264789', name: 'AMI shorts' },
  { id: '7504497909', name: 'Maison Margiela T-shirt' },
  { id: '7506354158', name: 'Dior sauvage Perfume' },
  { id: '7509135114', name: 'Bape Shorts' },
  { id: '7509139104', name: 'Air Force 1' },
  { id: '7508652252', name: 'Chanel Wallet' },
  { id: '7504476115', name: 'AMI short sleeve' },
  { id: '7510797594', name: 'Air Force 1 x Lv' },
  { id: '7504429355', name: 'LV Sweater' },
  { id: '7506152949', name: 'Adidas gazelle' },
  { id: '7507584936', name: 'Stone Island Hat' },
  { id: '7511955780', name: 'GUCCI keychain' },
  { id: '7514125246', name: 'Celine hat' },
  { id: '7513736650', name: 'Yeezy 500' },
  { id: '7513780172', name: 'OFF-WHITE Ow Be Right Back' },
  { id: '7510658292', name: 'Gallery Dept T-shirt' },
  { id: '7512839923', name: 'Amiri belt' },
  { id: '7513748568', name: 'Off-White Hoodie' },
  { id: '7509693749', name: 'Hermes Necklaces' },
  { id: '7511875080', name: 'New balance x miu miu' },
  { id: '7511894588', name: 'patagonia hat' },
  { id: '7506391499', name: 'moncler hat' },
  { id: '7509142938', name: 'Bapesta' },
  { id: '7511931920', name: 'Loewe Belt' },
  { id: '7509676037', name: 'Ralph Lauren POLO' },
  { id: '7510644359', name: 'LV Hat' },
  { id: '7512759093', name: 'Stone Island T-shirt' },
  { id: '7506850791', name: 'Swarovski Necklaces' },
  { id: '7513813790', name: 'Dior Sweater' },
  { id: '7511894067', name: 'Gallery Dept shorts' },
  { id: '7510660107', name: 'The North Face Bag' },
  { id: '7509503756', name: 'Palm Angel Hoodie' },
  { id: '7506395832', name: 'Chrome Hearts Hoodie' },
  { id: '7508207759', name: 'Dior Bag' },
  { id: '7507573304', name: 'Jordan Socks' },
  { id: '7510697743', name: 'Burberry Belt' },
  { id: '7507325637', name: 'Bape T-shirt' },
  { id: '7511910292', name: 'New balance 550' },
  { id: '7511397655', name: 'Airpods Pro Max' },
  { id: '7510083906', name: 'Corteiz shorts' },
  { id: '7510648277', name: 'Carhartt T-shirt' },
  { id: '7508992637', name: 'MLB Hat' },
  { id: '7508774440', name: 'Fendi Sunglasses' },
  { id: '7515401830', name: 'Denim Tears T-shirts' },
  { id: '7510023074', name: 'Lv Bag' },
  { id: '7511915899', name: 'Stone Island T-shirt' },
  { id: '7504513787', name: 'Amiri jeans' },
  { id: '7509989101', name: 'Jordan 4 [GX BATCH]' },
  { id: '7508947059', name: 'Lv Bag' },
  { id: '7507571344', name: 'Syna World Suit' },
  { id: '7508281470', name: 'Carhartt knitted hat' },
  { id: '7514146930', name: 'Jordan 1 low [PK BATCH]' },
  { id: '7508784229', name: 'Trapstar Suit' },
  { id: '7515380728', name: 'Goodspeed T-shirt' },
  { id: '7505776105', name: 'Chrome Hearts Jeans' },
  { id: '7508383696', name: 'Carhartt hat' },
  { id: '7507685614', name: 'Nike suit' },
  { id: '7510031953', name: 'Essentials Pants' },
  { id: '7504452849', name: 'LV Ombre Nomade Perfume' },
  { id: '7512820329', name: 'Burberry Hoodie' },
  { id: '7510077697', name: 'Jordan 6' },
  { id: '7508945119', name: 'Chanel Glasses' },
  { id: '7509135114', name: 'Bape Shorts' },
  { id: '7509977411', name: 'Sp5der Pants' },
  { id: '7507529041', name: 'Yeezy 700' },
  { id: '7514706326', name: 'Gallery Dept T-shirt' },
  { id: '7506858723', name: 'Casablanca hoodie' },
  { id: '7508107297', name: 'Nike Tech Suit' },
  { id: '7507295843', name: 'Bape T-shirt' },
  { id: '7506403762', name: 'Prada Bag' },
  { id: '7510019070', name: 'Stussy Hat' },
  { id: '7510616901', name: 'Ralph Lauren Hoodie Zip' },
  { id: '7507629599', name: 'Stone Island T-shirt' },
  { id: '7508197905', name: 'Ralph Lauren POLO' },
  { id: '7513721034', name: 'Ralph Lauren Sweater' },
  { id: '7509981486', name: 'Stone Island T-shirt' },
  { id: '7509059396', name: 'Chrome Hearts Hoodie' },
  { id: '7511595686', name: 'Syna World Hoodie' },
  { id: '7511867470', name: 'Adidas Socks' },
  { id: '7513956598', name: 'Nike air max 95' },
  { id: '7505687305', name: 'LV Belt' },
  { id: '7509650563', name: 'New Balance 991v2' },
  { id: '7507235237', name: 'Stone Island Sweatshirt' },
  { id: '7702660885', name: 'Nike Mind 001' },
  { id: '7504527647', name: 'Casablanca Pants' },
  { id: '7506372050', name: 'Chrome Hearts T-shirt' },
  { id: '7509654529', name: 'LV Bracelet' },
  { id: '7506452099', name: 'AMI T-shirt' },
  { id: '7504435211', name: 'Lv trainer' },
  { id: '7514684672', name: 'Adwysd Pants' },
  { id: '7506383912', name: 'Amiri hat' },
  { id: '7509101394', name: 'Stone Island jeans' },
  { id: '7534287775', name: 'Off-White Hoodie' },
  { id: '7511519284', name: 'Gallery Dept T-shirt' },
  { id: '7509633165', name: 'New balance 1906R' },
  { id: '7727364557', name: 'Nike Dunk SB' },
  { id: '7509448296', name: 'Nike Bag' },
  { id: '7504421459', name: 'Burberry Hat' },
  { id: '7512231421', name: 'Off-White Hoodie' },
  { id: '7504030657', name: 'AMI shorts' },
  { id: '7506411173', name: 'New Balance U574 x stone island' },
  { id: '7512713257', name: 'YSL Belt' },
  { id: '7514103454', name: 'Airpods pro 2' },
  { id: '7512843835', name: 'Off-white shoes' },
  { id: '7514135092', name: 'Ami Socks' },
  { id: '7514615466', name: 'Nofs Summer Set' },
  { id: '7508768390', name: 'AMI Cardigan' },
  { id: '7510031906', name: 'The North Face Bag' },
  { id: '7512296405', name: 'Adidas spezial' },
  { id: '7511595686', name: 'Syna World Hoodie' },
  { id: '7504458301', name: 'Chrome Hearts T-shirt' },
  { id: '7511949686', name: 'Trapstar Hoodie' },
  { id: '7508766362', name: 'The North Face Hat' },
  { id: '7511813565', name: 'Chrome Hearts Pants' },
  { id: '7507619707', name: 'Chanel Earring' },
  { id: '7504405539', name: 'Burberry Hero Perfume' },
  { id: '7507595931', name: 'Jordan 12' },
  { id: '7504226154', name: 'Apple Watch' },
  { id: '7511860567', name: 'Dior B30' },
  { id: '7509483914', name: 'Chrome Hearts bracelet' },
  { id: '7514164652', name: 'Nike Tech Hoodie' },
  { id: '7511915899', name: 'Stone Island jacket' },
  { id: '7509166226', name: 'Stussy wallet' },
  { id: '7513942598', name: 'Stone Island hoodie' },
  { id: '7514708328', name: 'moncler hat' },
  { id: '7513244172', name: 'Stone Island POLO' },
  { id: '7506778159', name: 'AMI T-shirt' },
  { id: '7509207698', name: 'Corteiz Vest' },
  { id: '7511870407', name: 'Jordan 5' },
  { id: '7505776105', name: 'Chrome Hearts Jeans' },
  { id: '7511565107', name: 'New Balance U574' },
  { id: '7511912224', name: 'Burberry Hat' },
  { id: '7511892544', name: 'Nike Air' },
  { id: '7506393818', name: 'Dior hat' },
  { id: '7505772193', name: 'Yeezy slide' },
  { id: '7505778105', name: 'Supreme Bag' },
  { id: '7505789915', name: 'Dior B27' },
  { id: '7514619476', name: 'JBL' },
  { id: '7744740077', name: 'Burberry Hoodie Zip' },
  { id: '7513799992', name: 'Gallery Dept Jeans' },
  { id: '7510654157', name: 'Adidas superstar' },
  { id: '7511858916', name: 'Corteiz Hoodie' },
  { id: '7508717088', name: 'Nike shox' },
  { id: '7512575826', name: 'Bape Hoodie' },
  { id: '7510012339', name: 'Ralph Lauren shorts' },
  { id: '7511880934', name: 'New Balance MR993' },
  { id: '7509990929', name: 'Balenciaga Hat' },
  { id: '7651099070', name: 'Arcteryx Hat' },
  { id: '7509914080', name: 'Burberry Pants' },
  { id: '7509028109', name: 'Adidas campus' },
  { id: '7509977411', name: 'Sp5der Hoodie' },
  { id: '7511566024', name: 'Burberry slide' },
  { id: '7511375544', name: 'Adidas samba' }
];

const { detectCategory } = require('../src/utils/categoryHelper');

// Map of Chinese/English variant labels to English clothing type words
const VARIANT_TYPE_MAP = [
    { keywords: ['卫衣', '连帽卫衣', 'hoodie', 'hoody', 'sweatshirt', 'bluza', '上衣外套'], type: 'hoodies', label: 'Hoodie' },
    { keywords: ['卫裤', '运动裤', '长裤', 'pants', 'trousers', 'joggers', 'sweatpants', 'spodnie'], type: 'pants', label: 'Pants' },
    { keywords: ['短裤', 'shorts', 'spodenki'], type: 'shorts', label: 'Shorts' },
    { keywords: ['t恤', 't-shirt', 'tshirt', 'shirt', 'koszulka', '上衣'], type: 't-shirts', label: 'T-shirt' },
    { keywords: ['外套', '夹克', 'jacket', 'coat', 'kurtka'], type: 'jackets', label: 'Jacket' },
    { keywords: ['裙子', '短裙', 'skirt'], type: 't-shirts', label: 'Skirt' },
];

// Strip the existing type keyword from a name and replace with new one
function adjustProductName(baseName, variantLabel) {
    if (!variantLabel) return baseName;

    // Find what type the variant label indicates
    const variantType = VARIANT_TYPE_MAP.find(entry =>
        entry.keywords.some(kw => variantLabel.includes(kw))
    );

    if (!variantType) return baseName; // Unknown variant, keep original name

    // Find what type the base name currently is
    const baseType = VARIANT_TYPE_MAP.find(entry =>
        entry.keywords.some(kw => baseName.toLowerCase().includes(kw.toLowerCase()))
    );

    // If the variant is the same type as the base name, keep original
    if (baseType && baseType.type === variantType.type) return baseName;

    // Replace the base name's type word with the variant's type word
    let newName = baseName;
    if (baseType) {
        // Remove the old type label from the name (e.g., "Hoodie", "Pants")
        const oldLabel = baseType.label;
        const regex = new RegExp(`\\b${oldLabel}\\b`, 'gi');
        newName = newName.replace(regex, variantType.label).trim();
    } else {
        // No type word in base name, just append the variant type
        newName = `${baseName} ${variantType.label}`;
    }

    return newName;
}

async function scrapeProductVariants(inputData) {
    let itemId = inputData.id;
    let customName = inputData.name;

    console.log(`\n🔍 Scraping item: ${itemId} (${customName})...`);
    const url = `https://weidian.com/item.html?itemID=${itemId}`;
    
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            }
        });

        const $ = cheerio.load(res.data);
        const scriptTag = $('#__rocker-render-inject__');
        
        if (scriptTag.length === 0) {
            console.error(`❌ Nie znaleziono danych dla ${itemId}. Bot protection?`);
            return [];
        }

        const data = JSON.parse(scriptTag.attr('data-obj'));
        const itemInfo = data.result.default_model.item_info;
        const baseName = customName || itemInfo.item_name;
        const basePriceCNY = parseFloat(itemInfo.origin_price);
        const priceUSD = (basePriceCNY * 0.14).toFixed(2);

        const skuProperties = data.result.default_model.sku_properties;
        const variants = [];

        if (skuProperties && skuProperties.attr_list) {
            const imageAttr = skuProperties.attr_list.find(attr => 
                attr.attr_values && attr.attr_values.some(v => v.img)
            );
            
            if (imageAttr && imageAttr.attr_values) {
                console.log(`✨ Znaleziono ${imageAttr.attr_values.length} wariantów!`);
                for (const val of imageAttr.attr_values) {
                    if (val.img) {
                        // Detect variant type from its label (Chinese/English)
                        const variantLabel = (val.attr_name || val.name || '').toLowerCase();
                        const adjustedName = adjustProductName(baseName, variantLabel);
                        const adjustedCategory = detectCategory(adjustedName);

                        if (adjustedName !== baseName) {
                            console.log(`  🔀 Zmieniono: "${baseName}" → "${adjustedName}" [${adjustedCategory}]`);
                        }

                        variants.push({
                            name: adjustedName,
                            price: parseFloat(priceUSD),
                            image: `${val.img}?w=400&h=400`,
                            category: adjustedCategory,
                            batch: 'best',
                            link: `https://www.kakobuy.com/item/details?url=${encodeURIComponent(url)}&affcode=${AFFILIATE_CODE}`
                        });
                    }
                }
            }
        }
        
        if (variants.length === 0) {
            console.log(`ℹ️ Brak wariantów kolorystycznych, biorę główne zdjęcie.`);
            variants.push({
                name: baseName,
                price: parseFloat(priceUSD),
                image: `${itemInfo.item_head}?w=400&h=400`,
                category: detectCategory(baseName),
                batch: 'best',
                link: `https://www.kakobuy.com/item/details?url=${encodeURIComponent(url)}&affcode=${AFFILIATE_CODE}`
            });
        }

        return variants;
    } catch (e) {
        console.error(`❌ Błąd scraping ${itemId}: ${e.message}`);
        return [];
    }
}

async function start() {
    try {
        console.log('🔗 Łączenie z MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Połączono!');

        console.log('🧹 Czyszczenie starych produktów z bazy...');
        await Product.deleteMany({});
        console.log('✨ Baza wyczyszczona.');

        const allProducts = [];
        let count = 0;
        
        for (const input of INPUT_LINKS) {
            count++;
            const variants = await scrapeProductVariants(input);
            for (const v of variants) {
                await Product.create(v);
                allProducts.push(v);
            }
            console.log(`[${count}/${INPUT_LINKS.length}] Dodano warianty dla: ${input.name}`);
            
            // Delay, żeby nie dostać bana
            await new Promise(r => setTimeout(r, 1200));
        }

        console.log(`\n🎉 KONIEC! Dodano łącznie ${allProducts.length} produktów do bazy.`);
        process.exit(0);
    } catch (err) {
        console.error('💥 KRYTYCZNY BŁĄD:', err);
        process.exit(1);
    }
}

start();
