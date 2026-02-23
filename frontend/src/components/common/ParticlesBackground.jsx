import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const ParticlesBackground = () => {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const options = useMemo(
    () => ({
      background: {
        color: {
          value: "transparent",
        },
      },
      fpsLimit: 60,
      interactivity: {
        events: {
          onClick: {
            enable: true,
            mode: "push",
          },
          onHover: {
            enable: true,
            mode: ["grab", "bubble"],
          },
        },
        modes: {
          push: {
            quantity: 2,
          },
          grab: {
            distance: 180,
            links: {
              opacity: 0.6,
            },
          },
          bubble: {
            distance: 180,
            size: 5,
            duration: 2,
            opacity: 0.8,
          },
        },
      },
      particles: {
        color: {
          value: ["#ff0099", "#00f0ff", "#fffdd0"],
        },
        links: {
          color: "#ff0099",
          distance: 150,
          enable: true,
          opacity: 0.15,
          width: 1,
        },
        move: {
          direction: "none",
          enable: true,
          outModes: {
            default: "bounce",
          },
          random: true,
          speed: 0.3,
          straight: false,
        },
        number: {
          density: {
            enable: true,
            area: 800,
          },
          value: 180,
        },
        opacity: {
          value: 0.5,
        },
        shape: {
          type: ["circle", "triangle"],
        },
        size: {
          value: { min: 1, max: 3 },
        },
      },
      detectRetina: true,
    }),
    [],
  );

  if (init) {
    return (
      <Particles
        id="tsparticles"
        options={options}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -1, /* Keeps it behind all app content */
        }}
      />
    );
  }

  return null;
};

export default ParticlesBackground;
