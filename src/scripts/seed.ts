//not necessary for now. will uncomment when its needed


// import { prisma } from '../config/db';

// async function main() {
//   const existing = await prisma.medicalEstablishment.findUnique({
//     where: { id: '3d24eb85-1b4b-4055-8f94-a712fa4ff1d2' },
//   });

//   if (!existing) {
//     await prisma.medicalEstablishment.create({
//       data: {
//         id: '3d24eb85-1b4b-4055-8f94-a712fa4ff1d2',
//         name: 'Central Blood Bank',
//         address: '555 Elvitigala Mawatha',
//         region: 'COLOMBO',
//         email: 'bloodbank.doh@atmoicmai',
//         bloodCapacity: 500,
//         isBloodBank: true,
//       },
//     });
//     console.log('Seeded successfully');
//   } else {
//     console.log('Record already exists.');
//   }
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(() => {
//     prisma.$disconnect();
//   });

