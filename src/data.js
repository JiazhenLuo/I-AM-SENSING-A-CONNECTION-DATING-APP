// One scripted profile only. Replace /public/photos/1.jpg ... 5.jpg with approved stills.
export const profiles = [{
  id: 'nellie', name: 'Nellie', age: 25,
  location: 'Burbank, Los Angeles', distance: '3 miles', job: 'Artist',
  bio: 'Hoping for a spiritual connection, more than just physical chemistry.',
  interests: ['Art galleries', 'Film photography', 'Late night talks'],
  photos: [1, 2, 3, 4, 5].map(i => `${import.meta.env.BASE_URL}photos/${i}.jpg`),
}]
