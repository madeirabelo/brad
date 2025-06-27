import React from 'react';
import './MandelbrotMovie.css';

const MandelbrotMovie = () => {
  return (
    <div className="mandelbrot-movie-container">
      <div className="movie-header">
        <h1>Mandelbrot Fractal Movie</h1>
        <p>Watch the mesmerizing Mandelbrot fractal in motion</p>
      </div>
      
      <div className="video-container">
        <video 
          controls
          autoPlay
          muted
          loop
          className="mandelbrot-video"
          poster="/mandelbrot-poster.jpg"
        >
          <source src="/mandelbrot-fractal-movie.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      
      <div className="movie-info">
        <h3>About This Fractal</h3>
        <p>
          The Mandelbrot set is one of the most famous fractals in mathematics. 
          This video showcases the infinite complexity and beauty of this mathematical object 
          as we zoom deeper into its intricate patterns.
        </p>
        <div className="video-controls-info">
          <h4>Video Controls:</h4>
          <ul>
            <li><strong>Play/Pause:</strong> Click the play button or spacebar</li>
            <li><strong>Volume:</strong> Adjust using the volume slider</li>
            <li><strong>Fullscreen:</strong> Click the fullscreen button for immersive viewing</li>
            <li><strong>Loop:</strong> The video will automatically loop for continuous viewing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MandelbrotMovie; 