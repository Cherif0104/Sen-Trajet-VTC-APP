import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

const driver = await sql`SELECT id, name, last_lat, last_lng, online, verified FROM drivers WHERE email = 'nassardine@example.com'`;
console.log('Driver:', JSON.stringify(driver[0], null, 2));

const ride = await sql`SELECT id, status, offered, pickup FROM rides WHERE id = 'd201b6d1-6143-47f8-9af1-8175a282d43a'`;
console.log('Ride:', JSON.stringify(ride[0], null, 2));

// Calculate distance
if (driver[0] && ride[0]) {
  const pickup = ride[0].pickup;
  const driverLat = parseFloat(driver[0].last_lat);
  const driverLng = parseFloat(driver[0].last_lng);
  const pickupLat = pickup.lat;
  const pickupLng = pickup.lng;
  
  const R = 6371; // Earth radius in km
  const dLat = (pickupLat - driverLat) * Math.PI / 180;
  const dLng = (pickupLng - driverLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(driverLat * Math.PI / 180) * Math.cos(pickupLat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  console.log(`Distance from driver to pickup: ${distance.toFixed(2)} km`);
  console.log(`Within 7km radius: ${distance <= 7}`);
}

await sql.end();
