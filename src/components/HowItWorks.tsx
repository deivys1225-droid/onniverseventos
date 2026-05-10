import { motion } from "framer-motion";
import { Headset, Wifi, Sparkles } from "lucide-react";
import vrImage from "@/assets/vr-experience.jpg";

const steps = [
  {
    icon: Wifi,
    title: "Elige tu evento",
    description: "Explora conciertos en vivo, grabaciones y experiencias exclusivas.",
  },
  {
    icon: Headset,
    title: "Ponte el headset",
    description: "Compatible con Meta Quest, Apple Vision Pro y más dispositivos VR.",
  },
  {
    icon: Sparkles,
    title: "Vive la experiencia",
    description: "Audio espacial 360° y video inmersivo como si estuvieras ahí.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-6">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden glow-cyan">
              <img
                src={vrImage}
                alt="Persona con casco de realidad virtual viviendo una experiencia inmersiva audiovisual OnniVers"
                loading="lazy"
                width={800}
                height={800}
                className="w-full aspect-square object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-neon-cyan/10 via-transparent to-neon-magenta/10" />
            </div>
          </motion.div>

          {/* Steps */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                Cómo <span className="text-gradient-neon">funciona</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-12">
                Tres pasos para sumergirte en la música
              </p>
            </motion.div>

            <div className="space-y-8">
              {steps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex gap-5"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-semibold text-foreground mb-1">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
