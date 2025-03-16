// Select all images for lazy loading
const images = document.querySelectorAll('img[data-src]'); // Use data-src to prevent immediate loading

// Function to preload an image
const preloadImage = (image) => {
  const src = image.getAttribute('data-src'); // Use data-src attribute
  if (!src) {
    return;
  }
  
  const img = new Image(); // Create a new image object
  img.src = src; // Set the source of the image to load
  img.onload = () => {
    image.src = src; // Set the src attribute when the image is loaded
    image.removeAttribute('data-src'); // Remove data-src attribute after loading
  };
  img.onerror = () => {
    console.error(`Failed to preload image: ${src}`);
  };
};

// Set up Intersection Observer to preload images
const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const image = entry.target;
      preloadImage(image);
      observer.unobserve(image); // Stop observing the image after it has been loaded
    }
  });
}, {
  rootMargin: '200px', // Preload before the image appears on screen by 200px
  threshold: 0.1 // Load when 10% of the image appears on screen
});

// Start observing each image
images.forEach(image => {
  observer.observe(image); // Begin observing the image
});