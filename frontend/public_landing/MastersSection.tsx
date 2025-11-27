import { useState } from "react";
import { Award, X } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import {
  Dialog,
  DialogContent,
} from "./components/ui/dialog";

export function MastersSection() {
  const { t, language } = useLanguage();
  const [selectedMaster, setSelectedMaster] = useState<number | null>(null);

  const masters = [
    {
      name: t('master1Name') || "Master 1",
      role: t('master1Role') || "Role 1",
      experience: t('master1Exp') || "Experience 1",
      certification: t('master1Cert') || "Cert 1",
      image: "https://images.unsplash.com/photo-1615562715183-9528405b75ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBiZWF1dHklMjBtYXN0ZXIlMjB3b21hbnxlbnwxfHx8fDE3NjQyMTgzMjd8MA&ixlib=rb-4.1.0&q=80&w=1080",
      certificates: [
        "https://images.unsplash.com/photo-1617149897850-9b0dea0a2705?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXBsb21hJTIwY2VydGlmaWNhdGUlMjBhd2FyZHxlbnwxfHx8fDE3NjQyMTgzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "https://images.unsplash.com/photo-1742415888265-d5044039d8e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBtYXN0ZXIlMjBjZXJ0aWZpY2F0ZXxlbnwxfHx8fDE3NjQyMTgyMzd8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "https://images.unsplash.com/photo-1617149897850-9b0dea0a2705?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXBsb21hJTIwY2VydGlmaWNhdGUlMjBhd2FyZHxlbnwxfHx8fDE3NjQyMTgzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      ]
    },
    {
      name: t('master2Name') || "Master 2",
      role: t('master2Role') || "Role 2",
      experience: t('master2Exp') || "Experience 2",
      certification: t('master2Cert') || "Cert 2",
      image: "https://images.unsplash.com/photo-1737063935340-f9af0940c4c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyc3R5bGlzdCUyMHByb2Zlc3Npb25hbCUyMHdvbWFufGVufDF8fHx8MTc2NDIxODMyN3ww&ixlib=rb-4.1.0&q=80&w=1080",
      certificates: [
        "https://images.unsplash.com/photo-1617149897850-9b0dea0a2705?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXBsb21hJTIwY2VydGlmaWNhdGUlMjBhd2FyZHxlbnwxfHx8fDE3NjQyMTgzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "https://images.unsplash.com/photo-1742415888265-d5044039d8e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBtYXN0ZXIlMjBjZXJ0aWZpY2F0ZXxlbnwxfHx8fDE3NjQyMTgyMzd8MA&ixlib=rb-4.1.0&q=80&w=1080",
      ]
    },
    {
      name: t('master3Name') || "Master 3",
      role: t('master3Role') || "Role 3",
      experience: t('master3Exp') || "Experience 3",
      certification: t('master3Cert') || "Cert 3",
      image: "https://images.unsplash.com/photo-1600637070413-0798fafbb6c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWtldXAlMjBhcnRpc3QlMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzY0MTQwNDY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
      certificates: [
        "https://images.unsplash.com/photo-1617149897850-9b0dea0a2705?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXBsb21hJTIwY2VydGlmaWNhdGUlMjBhd2FyZHxlbnwxfHx8fDE3NjQyMTgzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "https://images.unsplash.com/photo-1742415888265-d5044039d8e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBtYXN0ZXIlMjBjZXJ0aWZpY2F0ZXxlbnwxfHx8fDE3NjQyMTgyMzd8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "https://images.unsplash.com/photo-1617149897850-9b0dea0a2705?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXBsb21hJTIwY2VydGlmaWNhdGUlMjBhd2FyZHxlbnwxfHx8fDE3NjQyMTgzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      ]
    }
  ];

  return (
    <>
      <section className="py-24 px-6 lg:px-12 bg-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-[#b8a574] uppercase tracking-[0.2em] mb-4">{t('mastersTag') || "Our Team"}</p>
            <h2 className="text-[#2d2d2d] mb-6">
              {t('mastersTitle') || "Meet Our Masters"}
            </h2>
            <p className="text-[#6b6b6b] max-w-2xl mx-auto">
              {t('mastersDesc') || "Experienced professionals dedicated to your beauty."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {masters.map((master, index) => (
              <div key={index} className="group">
                <div className="relative overflow-hidden rounded-2xl mb-6 aspect-[3/4]">
                  <img
                    src={master.image}
                    alt={master.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <div className="text-center space-y-3">
                  <h3 className="text-[#2d2d2d] tracking-wider">{master.name}</h3>
                  <p className="text-[#b8a574] uppercase tracking-wider text-sm">{master.role}</p>
                  <p className="text-[#6b6b6b] text-sm">{master.experience}</p>

                  <div className="flex items-center justify-center gap-2 text-[#6b6b6b] text-sm">
                    <Award className="w-4 h-4 text-[#b8a574]" />
                    <span>{master.certification}</span>
                  </div>

                  <button
                    onClick={() => setSelectedMaster(index)}
                    className="mt-4 px-8 py-3 bg-transparent border-2 border-[#2d2d2d] text-[#2d2d2d] rounded-full hover:bg-[#2d2d2d] hover:text-white transition-all uppercase tracking-wider text-sm"
                  >
                    {t('viewCertificates') || "View Certificates"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={selectedMaster !== null} onOpenChange={() => setSelectedMaster(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-none p-0">
          {selectedMaster !== null && (
            <div className="relative">
              <button
                onClick={() => setSelectedMaster(null)}
                className="absolute top-4 right-4 z-50 p-2 bg-white/90 rounded-full hover:bg-white transition-colors shadow-lg"
              >
                <X className="w-5 h-5 text-[#2d2d2d]" />
              </button>

              <div className="p-8 lg:p-12">
                <div className="flex flex-col md:flex-row gap-8 mb-12">
                  <div className="md:w-1/3">
                    <div className="relative overflow-hidden rounded-2xl aspect-[3/4]">
                      <img
                        src={masters[selectedMaster].image}
                        alt={masters[selectedMaster].name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="md:w-2/3 flex flex-col justify-center">
                    <h2 className="text-[#2d2d2d] mb-4 tracking-wider">
                      {masters[selectedMaster].name}
                    </h2>
                    <p className="text-[#b8a574] uppercase tracking-wider mb-4">
                      {masters[selectedMaster].role}
                    </p>
                    <p className="text-[#6b6b6b] mb-4">
                      {masters[selectedMaster].experience}
                    </p>
                    <div className="flex items-center gap-2 text-[#6b6b6b]">
                      <Award className="w-5 h-5 text-[#b8a574]" />
                      <span>{masters[selectedMaster].certification}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[#2d2d2d] mb-8 tracking-wider text-center">
                    {t('certificates') || "Certificates"}
                  </h3>

                  <div className="grid md:grid-cols-3 gap-6">
                    {masters[selectedMaster].certificates.map((cert, idx) => (
                      <div key={idx} className="relative overflow-hidden rounded-xl aspect-[3/4] bg-gray-100">
                        <img
                          src={cert}
                          alt={`Certificate ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-12 text-center">
                  <button
                    className="px-12 py-4 bg-[#2d2d2d] text-white rounded-full hover:bg-[#1a1a1a] transition-colors uppercase tracking-wider"
                    onClick={() => {
                      setSelectedMaster(null);
                      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t('bookNow') || "Book Now"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
