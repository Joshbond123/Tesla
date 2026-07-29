// Shared vehicle data — single source of truth for all pages
// Images served from Supabase Storage (no third-party hosting)
var SUPABASE_IMG = 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/';

var VEHICLE_DATA = {
  cybertruck: {
    id:'cybertruck', name:'Cybertruck', price:'$71,985', emoji:'\uD83D\uDEFB',
    img: SUPABASE_IMG + 'cybertruck-main.png',
    badge:'Built Tough',
    range:'325 mi (EPA est.)', accel:'4.1s 0\u201360 mph', top:'112 mph',
    seats:'5 adults', drivetrain:'Dual Motor All-Wheel Drive',
    battery:'123 kWh Lithium-Ion',
    charging:'Up to 350 kW DC fast charging. Add up to 137 miles in 15 minutes at a Tesla Supercharger.',
    safety:'Forward collision warning with automatic emergency braking, blind spot monitoring, lane departure prevention, 360\u00b0 cameras, built-in dashcam, 30-day Full Self-Driving (Supervised) trial included.',
    interior:'18.5\u201D center touchscreen, heated and power-adjustable front seats, heated steering wheel, ambient lighting, panoramic moonroof, dual wireless phone chargers, 7-speaker premium audio system.',
    gallery:[
      SUPABASE_IMG + 'cybertruck-gallery-1.png',
      SUPABASE_IMG + 'cybertruck-gallery-2.png',
      SUPABASE_IMG + 'cybertruck-gallery-3.png'
    ],
    desc:'The Tesla Cybertruck is a revolutionary all-electric pickup truck with an ultra-hard 30X cold-rolled stainless steel exoskeleton. Designed for maximum durability and passenger protection, it features adaptive air suspension with up to 12\u201D of ground clearance, a 6.5-foot composite bed with a powered tonneau cover, and up to 11,000 lbs of towing capacity.'
  },
  modely: {
    id:'modely', name:'Model Y', price:'$41,380', emoji:'\uD83D\uDE99',
    img: SUPABASE_IMG + 'modely-main.png',
    badge:'Best Seller',
    range:'321 mi (EPA est.)', accel:'6.8s 0\u201360 mph', top:'135 mph',
    seats:'5 adults (7 optional)', drivetrain:'Rear-Wheel Drive',
    battery:'82 kWh Lithium-Ion',
    charging:'Up to 250 kW DC fast charging. Add up to 169 miles in 15 minutes at a Tesla Supercharger.',
    safety:'5-star NHTSA safety rating, forward collision warning, automatic emergency braking, blind spot monitoring, lane departure avoidance, adaptive cruise control, 30-day Full Self-Driving (Supervised) trial included.',
    interior:'15.4\u201D center touchscreen, heated power-adjustable front seats, heated steering wheel, panoramic glass roof, dual wireless phone chargers, 7-speaker audio system, up to 76 cu ft cargo space with seats folded.',
    gallery:[
      SUPABASE_IMG + 'modely-gallery-1.png',
      SUPABASE_IMG + 'modely-gallery-2.png',
      SUPABASE_IMG + 'modely-gallery-3.png'
    ],
    desc:'The Tesla Model Y is the world\u2019s best-selling electric midsize SUV, combining class-leading cargo space of up to 76 cubic feet with versatile seating for up to seven. An expansive all-glass roof, minimalist interior, and access to Tesla\u2019s unrivaled global Supercharger network with over 80,000 stations worldwide make it the ultimate family EV.'
  },
  models: {
    id:'models', name:'Model S', price:'$111,380', emoji:'\uD83C\uDFCE\uFE0F',
    img: SUPABASE_IMG + 'models-main.png',
    badge:'Luxury Performance',
    range:'410 mi (EPA est.)', accel:'3.1s 0\u201360 mph', top:'200 mph (Plaid)',
    seats:'5 adults', drivetrain:'Dual Motor All-Wheel Drive',
    battery:'100 kWh Lithium-Ion',
    charging:'Up to 250 kW DC fast charging. Recharge up to 205 miles in 15 minutes at a Tesla Supercharger.',
    safety:'NHTSA 5-star safety rating, forward collision warning, automatic emergency braking, blind spot monitoring, lane departure avoidance, full 360\u00B0 camera coverage, adaptive headlights.',
    interior:'17.4\u201D front and 9.4\u201D rear touchscreens, 22-speaker 960-watt audio system, ventilated heated front seats, tri-zone climate control, HEPA air filtration, all-glass panoramic roof, wireless phone charging.',
    gallery:[
      SUPABASE_IMG + 'models-gallery-1.png',
      SUPABASE_IMG + 'models-gallery-2.png',
      SUPABASE_IMG + 'models-gallery-3.png'
    ],
    desc:'The Tesla Model S is the benchmark for luxury electric performance sedans. With a stunning 410-mile range and 670 horsepower, it delivers breathtaking acceleration and refined comfort. Its minimalist interior features three ultra-responsive displays, a 22-speaker 960-watt studio-quality audio system, and advanced Full Self-Driving capability.'
  },
  model3: {
    id:'model3', name:'Model 3', price:'$38,380', emoji:'\uD83D\uDE97',
    img: SUPABASE_IMG + 'model3-main.png',
    badge:'Most Popular',
    range:'321 mi (EPA est.)', accel:'5.8s 0\u201360 mph', top:'140 mph',
    seats:'5 adults', drivetrain:'Rear-Wheel Drive',
    battery:'82 kWh Lithium-Ion',
    charging:'Up to 250 kW DC fast charging. Add up to 170 miles in 15 minutes at a Tesla Supercharger.',
    safety:'NHTSA 5-star safety rating, forward collision warning, automatic emergency braking, blind spot monitoring, lane departure avoidance, adaptive cruise control, 30-day Full Self-Driving (Supervised) trial included.',
    interior:'15.4\u201D center touchscreen, heated power-adjustable front seats, panoramic glass roof, dual wireless charging pads, 7-speaker audio system, 24 cu ft cargo space, minimalist premium design with textile seats.',
    gallery:[
      SUPABASE_IMG + 'model3-gallery-1.png',
      SUPABASE_IMG + 'model3-gallery-2.png',
      SUPABASE_IMG + 'model3-gallery-3.png'
    ],
    desc:'The 2026 Tesla Model 3 is the most affordable and efficient electric sport sedan in the Tesla lineup. Delivering an impressive 321 miles of range and a 5.8-second 0\u201360 time, the Model 3 combines exhilarating performance with industry-leading efficiency and seamless access to Tesla\u2019s expansive global Supercharger network.'
  },
  modelx: {
    id:'modelx', name:'Model X', price:'$116,380', emoji:'\uD83D\uDE90',
    img: SUPABASE_IMG + 'modelx-main.png',
    badge:'Iconic Design',
    range:'352 mi (EPA est.)', accel:'3.8s 0\u201360 mph', top:'149 mph',
    seats:'Up to 7 adults', drivetrain:'Dual Motor All-Wheel Drive',
    battery:'100 kWh Lithium-Ion',
    charging:'Up to 250 kW DC fast charging. Recharge up to 179 miles in 15 minutes at a Tesla Supercharger.',
    safety:'360\u00B0 camera system, forward collision warning, automatic emergency braking, blind spot monitoring, lane departure avoidance, Full Self-Driving (Supervised) capable, adaptive LED headlights.',
    interior:'17.4\u201D front and 9.4\u201D rear touchscreens, iconic Falcon Wing doors for easy access, ventilated heated front seats, tri-zone climate control, HEPA air filtration, panoramic windshield, 22-speaker 960-watt audio system, up to 91.5 cu ft cargo space.',
    gallery:[
      SUPABASE_IMG + 'modelx-gallery-1.png',
      SUPABASE_IMG + 'modelx-gallery-2.png',
      SUPABASE_IMG + 'modelx-gallery-3.png'
    ],
    desc:'The 2026 Tesla Model X combines luxury SUV practicality with sports car performance. Featuring iconic Falcon Wing doors, available three-row seating for up to seven passengers, and a massive panoramic windshield, the Model X delivers a unique blend of futuristic design, cutting-edge technology, and everyday versatility.'
  }
};

// Save selected vehicle to localStorage (shared helper)
function saveSelectedVehicle(vehicleId) {
  var v = VEHICLE_DATA[vehicleId];
  if (!v) return false;
  var car = { id:v.id, name:v.name, price:v.price, emoji:v.emoji, img:v.img, badge:v.badge, color:v.name };
  try {
    localStorage.setItem('tesla_selected_car', JSON.stringify(car));
    return true;
  } catch(e) { return false; }
}
