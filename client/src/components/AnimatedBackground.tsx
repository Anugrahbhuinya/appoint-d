import { motion } from 'framer-motion';
import { useState } from 'react';

// --- 1. Internal Helper Component (Replaces the missing import) ---
function ImageWithFallback({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);

  return (
    <img
      src={error ? 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1080' : src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}

// --- 2. Your Configuration ---
const backgroundImages = [
  {
    url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2N0b3IlMjBjb25zdWx0YXRpb258ZW58MXx8fHwxNzYyOTgxNzMwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    position: { top: '10%', left: '-10%' },
    rotation: -15,
    delay: 0,
  },
  {
    url: 'https://images.unsplash.com/photo-1512069511692-b82d787265cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwaGVhbHRoY2FyZXxlbnwxfHx8fDE3NjI5NzI4NDh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    position: { top: '60%', left: '-5%' },
    rotation: 12,
    delay: 0.5,
  },
  {
    url: 'https://images.unsplash.com/photo-1758691461932-d0aa0ebf6b31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWxlbWVkaWNpbmUlMjB2aWRlbyUyMGNhbGx8ZW58MXx8fHwxNzYzMDI4NTIwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    position: { top: '15%', right: '-10%' },
    rotation: 18,
    delay: 1,
  },
  {
    url: 'https://images.unsplash.com/photo-1700832082200-af7deeb63d9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGV0aG9zY29wZSUyMG1lZGljYWx8ZW58MXx8fHwxNzYzMDQ5MDMyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    position: { top: '65%', right: '-8%' },
    rotation: -20,
    delay: 1.5,
  },
  {
    url: 'https://images.unsplash.com/photo-1662414185445-b9a05e26dba0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3NwaXRhbCUyMG1vZGVybnxlbnwxfHx8fDE3NjMwNjE3NjB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    position: { bottom: '-10%', left: '15%' },
    rotation: 8,
    delay: 2,
  },
  {
    url: 'https://images.unsplash.com/photo-1606206873764-fd15e242df52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NjI5OTUyNzN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    position: { bottom: '-15%', right: '20%' },
    rotation: -12,
    delay: 2.5,
  },
];

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Overlay gradient to darken background for readability */}
      <div className="absolute inset-0 bg-black/80 z-[1]" />
      
      {backgroundImages.map((img, index) => (
        <motion.div
          key={index}
          className="absolute w-72 h-48 overflow-hidden rounded-2xl border-4 shadow-2xl z-0"
          style={{
            ...img.position,
            // Use your specific theme colors here
            borderColor: index % 3 === 0 ? '#ea580c' : index % 3 === 1 ? '#0d9488' : '#3f3f46',
          }}
          initial={{ 
            opacity: 0,
            scale: 0.8,
            rotate: img.rotation,
          }}
          animate={{ 
            opacity: 0.3, // Kept low so it doesn't distract from the form
            scale: 1,
            y: [0, -20, 0],
            rotate: [img.rotation, img.rotation + 5, img.rotation],
          }}
          transition={{
            opacity: { delay: img.delay, duration: 0.8 },
            scale: { delay: img.delay, duration: 0.8 },
            y: { 
              delay: img.delay + 1,
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            rotate: {
              delay: img.delay + 1,
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        >
          <ImageWithFallback
            src={img.url}
            alt={`Healthcare background ${index + 1}`}
            className="w-full h-full object-cover opacity-60"
          />
        </motion.div>
      ))}

      {/* Additional floating accent elements (Orbs) */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-orange-600/10 blur-[100px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-teal-600/10 blur-[100px]"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />
    </div>
  );
}