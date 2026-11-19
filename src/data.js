// One scripted profile only. Replace /public/photos/1.jpeg ... 5.jpeg with approved stills.
export const profiles = [{
  id: 'nellie', name: 'Nellie', age: 25,
  avatar: `${import.meta.env.BASE_URL}photos/profile.png`,
  location: 'Burbank, Los Angeles', distance: '3 miles', job: 'Fortune teller',
  bio: 'Hoping for a spiritual connection, more than just physical chemistry.',
  interests: ['Art galleries', 'Film photography', 'Late night talks'],
  photos: [1, 2, 3, 4, 5].map(i => `${import.meta.env.BASE_URL}photos/${i}.jpeg`),
}]
