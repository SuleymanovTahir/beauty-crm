import React, { useState, useEffect } from 'react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { Calendar, Clock, Sparkles, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import { useTranslation } from 'react-i18next';


interface Testimonial {
  name: string;
  rating: number;
  text: string;
  avatar: string;
}



export default function Home() {
  const navigate = useNavigate();
  const [services, setServices] = useState<string[]>([]);
  const { t } = useTranslation(['public/Home', 'common']);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { i18n } = useTranslation();
        const currentLang = i18n.language;
        const data = await apiClient.getPublicReviews(currentLang);
        if (data && data.reviews && data.reviews.length > 0) {
          setTestimonials(data.reviews);
        } else {
          // Fallback if API returns empty (e.g. network error)
          const loadedTestimonials = t('home:testimonials.items', { returnObjects: true });
          if (Array.isArray(loadedTestimonials) && loadedTestimonials.length > 0) {
            setTestimonials(loadedTestimonials.map((item: any) => ({
              name: item.name,
              rating: 5,
              text: item.text,
              avatar: item.name.charAt(0).toUpperCase()
            })));
          }
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
        // Fallback on error
        const loadedTestimonials = t('home:testimonials.items', { returnObjects: true });
        if (Array.isArray(loadedTestimonials)) {
          setTestimonials(loadedTestimonials.map((item: any) => ({
            name: item.name,
            rating: 5,
            text: item.text,
            avatar: item.name.charAt(0).toUpperCase()
          })));
        }
      }
    };

    fetchReviews();
  }, [t]);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [loadingServices, setLoadingServices] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: '',
    date: '',
    time: ''
  });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await apiClient.getPublicServices();
        const serviceNames = data.services.map((s: any) => s.name).slice(0, 8);
        setServices(serviceNames);
      } catch (err) {
        console.error('Error fetching services:', err);
        const fallbackServices = t('home:services.items', { returnObjects: true });
        setServices(Array.isArray(fallbackServices) ? fallbackServices : []);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.service || !formData.date || !formData.time) {
      toast.error(t('home:booking.validation'));
      return;
    }
    navigate('/success', { state: formData });
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[600px] bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1695527081827-fdbc4e77be9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbiUyMHNwYSUyMGludGVyaW9yfGVufDF8fHx8MTc2MDg1MDUzNXww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Beauty Salon"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-pink-600" />
              <span className="text-pink-600">{t('home:hero.badge')}</span>
            </div>
            <h1 className="text-5xl text-gray-900 mb-6">
              {t('home:hero.title')}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              {t('home:hero.description')}
            </p>
            <div className="flex gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg"
                onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t('home:hero.bookButton')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/price-list')}
              >
                {t('home:hero.servicesButton')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 mb-4">{t('home:features.title')}</h2>
            <p className="text-xl text-gray-600">{t('home:features.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
              <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">{t('home:features.items.masters.title')}</h3>
              <p className="text-gray-600">
                {t('home:features.items.masters.description')}
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">{t('home:features.items.materials.title')}</h3>
              <p className="text-gray-600">
                {t('home:features.items.materials.description')}
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
              <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">{t('home:features.items.schedule.title')}</h3>
              <p className="text-gray-600">
                {t('home:features.items.schedule.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 mb-4">{t('home:gallery.title')}</h2>
            <p className="text-xl text-gray-600">{t('home:gallery.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative h-80 rounded-2xl overflow-hidden group">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1600637070413-0798fafbb6c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWtldXAlMjBhcnRpc3QlMjBjb3NtZXRpY3N8ZW58MXx8fHwxNzYwODUwNTM2fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Makeup"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <p className="text-white text-lg">{t('home:gallery.items.makeup')}</p>
              </div>
            </div>

            <div className="relative h-80 rounded-2xl overflow-hidden group">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHNwYSUyMHRyZWF0bWVudHxlbnwxfHx8fDE3NjA3NzczOTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Spa"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <p className="text-white text-lg">{t('home:gallery.items.facial')}</p>
              </div>
            </div>

            <div className="relative h-80 rounded-2xl overflow-hidden group">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1695527081827-fdbc4e77be9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbiUyMHNwYSUyMGludGVyaW9yfGVufDF8fHx8MTc2MDg1MDUzNXww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Salon Interior"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <p className="text-white text-lg">{t('home:gallery.items.salon')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 mb-4">{t('home:testimonials.title')}</h2>
            <p className="text-xl text-gray-600">{t('home:testimonials.subtitle')}</p>
          </div>

          {testimonials.length > 0 ? (
            <div className="relative bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-12">
              <button
                onClick={prevTestimonial}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={nextTestimonial}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-6">
                  {testimonials[currentTestimonial].avatar}
                </div>
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-xl text-gray-700 mb-6 italic">
                  "{testimonials[currentTestimonial].text}"
                </p>
                <p className="text-lg text-gray-900">
                  {testimonials[currentTestimonial].name}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Booking Form */}
      <section id="booking-form" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-gray-900 mb-4">{t('home:booking.title')}</h2>
            <p className="text-xl text-gray-600">{t('home:booking.description')}</p>
          </div>

          {loadingServices ? (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <p className="text-gray-600">{t('home:booking.loading')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">{t('home:booking.form.name')}</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('home:booking.form.namePlaceholder')}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">{t('home:booking.form.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={t('home:booking.form.phonePlaceholder')}
                  />
                </div>

                <div>
                  <Label htmlFor="service">{t('home:booking.form.service')}</Label>
                  <Select required value={formData.service} onValueChange={(value) => setFormData({ ...formData, service: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('home:booking.form.servicePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="date">{t('home:booking.form.date')}</Label>
                    <Input
                      id="date"
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="time">{t('home:booking.form.time')}</Label>
                    <Input
                      id="time"
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg" size="lg">
                  <Calendar className="w-5 h-5 mr-2" />
                  {t('home:booking.form.submit')}
                </Button>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}