import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Package, TrendingUp, X, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { useCurrency } from '../../hooks/useSalonSettings';
import '../../styles/crm-pages.css';



interface Product {
    id: number;
    name: string;
    name_ru?: string;
    category?: string;
    price: number;
    stock_quantity: number;
    min_stock_level: number;
    is_active: boolean;
    photos?: string | string[];
}

const Products = () => {
    const { t } = useTranslation('admin/products');
    const { currency } = useCurrency();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showMovementDialog, setShowMovementDialog] = useState(false);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        loadProducts();
        loadCategories();
    }, [filterCategory]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const response = await api.getProducts(filterCategory);
            const parsedProducts = response.products.map((p: any) => ({
                ...p,
                photos: Array.isArray(p.photos)
                    ? p.photos
                    : (typeof p.photos === 'string' && p.photos.startsWith('[')
                        ? JSON.parse(p.photos)
                        : (p.photos ? [p.photos] : []))
            }));
            setProducts(parsedProducts);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await api.getProductCategories();
            setCategories(response.categories);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('messages.confirmDelete'))) return;

        try {
            await api.delete(`/api/products/${id}`);
            loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    const getStockStatus = (product: Product) => {
        if (product.stock_quantity === 0) return 'out-of-stock';
        if (product.stock_quantity <= product.min_stock_level) return 'low-stock';
        return 'in-stock';
    };

    return (
        <div className="crm-page">
            <div className="crm-page-header">
                <div>
                    <h1>{t('title')}</h1>
                    <p className="text-gray-600">{t('subtitle')}</p>
                </div>
                <button className="crm-btn-primary" onClick={() => setShowAddDialog(true)}>
                    <Plus size={20} />
                    {t('addProduct')}
                </button>
            </div>

            <div className="crm-filters">
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="crm-filter-select"
                >
                    <option value="">{t('allCategories')}</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="crm-loading">{t('loading')}</div>
            ) : (
                <div className="crm-grid crm-grid-3">
                    {products.map((product) => (
                        <div key={product.id} className="crm-card">
                            <div className="crm-card-header">
                                <div className="crm-card-icon overflow-hidden bg-gray-50 flex items-center justify-center">
                                    {product.photos && product.photos.length > 0 ? (
                                        <img src={product.photos[0]} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Package size={24} className="text-gray-400" />
                                    )}
                                </div>
                                <div className="crm-card-title">
                                    <h3>{product.name_ru || product.name}</h3>
                                    {product.category && (
                                        <span className="crm-badge">{product.category}</span>
                                    )}
                                </div>
                            </div>

                            <div
                                className="crm-card-body cursor-pointer hover:bg-gray-50/50 transition-colors"
                                onClick={() => {
                                    setSelectedProduct(product);
                                    setShowDetailDialog(true);
                                }}
                            >
                                <div className="crm-detail-row">
                                    <span className="crm-detail-label">{t('form.price')}:</span>
                                    <span className="crm-detail-value font-bold text-pink-600">{product.price} {currency}</span>
                                </div>
                                <div className="crm-detail-row text-xs mt-1">
                                    <span className="crm-detail-label">{t('form.stockQuantity')}:</span>
                                    <span className={`crm-detail-value font-medium crm-stock-${getStockStatus(product)}`}>
                                        {product.stock_quantity}
                                    </span>
                                </div>
                            </div>

                            <div className="crm-card-footer">
                                <button
                                    className="crm-btn-icon"
                                    onClick={() => {
                                        setSelectedProduct(product);
                                        setShowMovementDialog(true);
                                    }}
                                    title={t('movement.title')}
                                >
                                    <TrendingUp size={16} />
                                </button>
                                <button
                                    className="crm-btn-icon"
                                    onClick={() => {
                                        setSelectedProduct(product);
                                        setShowEditDialog(true);
                                    }}
                                    title={t('edit')}
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    className="crm-btn-icon"
                                    onClick={() => handleDelete(product.id)}
                                    title={t('delete')}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddDialog && (
                <ProductDialog
                    onClose={() => setShowAddDialog(false)}
                    onSuccess={() => {
                        setShowAddDialog(false);
                        loadProducts();
                    }}
                />
            )}

            {showEditDialog && selectedProduct && (
                <ProductDialog
                    product={selectedProduct}
                    onClose={() => {
                        setShowEditDialog(false);
                        setSelectedProduct(null);
                    }}
                    onSuccess={() => {
                        setShowEditDialog(false);
                        setSelectedProduct(null);
                        loadProducts();
                    }}
                />
            )}

            {showMovementDialog && selectedProduct && (
                <MovementDialog
                    product={selectedProduct}
                    onClose={() => {
                        setShowMovementDialog(false);
                        setSelectedProduct(null);
                    }}
                    onSuccess={() => {
                        setShowMovementDialog(false);
                        setSelectedProduct(null);
                        loadProducts();
                    }}
                />
            )}

            {showDetailDialog && selectedProduct && (
                <ProductDetailDialog
                    product={selectedProduct}
                    onClose={() => {
                        setShowDetailDialog(false);
                        setSelectedProduct(null);
                    }}
                />
            )}
        </div>
    );
};

const ProductDialog = ({ product, onClose, onSuccess }: any) => {
    const { t } = useTranslation('admin/products');
    const [formData, setFormData] = useState({
        name: product?.name || '',
        name_ru: product?.name_ru || '',
        name_en: product?.name_en || '',
        name_ar: product?.name_ar || '',
        category: product?.category || '',
        price: product?.price || 0,
        cost_price: product?.cost_price || 0,
        weight: product?.weight || null,
        weight_unit: product?.weight_unit || 'g',
        volume: product?.volume || null,
        volume_unit: product?.volume_unit || 'ml',
        expiry_date: product?.expiry_date || '',
        stock_quantity: product?.stock_quantity || 0,
        min_stock_level: product?.min_stock_level || 0,
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        supplier: product?.supplier || '',
        notes: product?.notes || '',
        is_active: product?.is_active ?? true,
        photos: Array.isArray(product?.photos)
            ? product.photos
            : (typeof product?.photos === 'string' && product.photos.startsWith('[')
                ? JSON.parse(product.photos)
                : (product?.photos ? [product.photos] : []))
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                photos: JSON.stringify(formData.photos)
            };
            if (product) {
                await api.put(`/api/products/${product.id}`, payload);
            } else {
                await api.post('/api/products', payload);
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving product:', error);
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal modal-large" onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <h2>{product ? t('edit') : t('addProduct')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="crm-form-content">
                        <div className="crm-form-grid">
                            <div className="crm-form-group">
                                <label className="crm-label">{t('form.name')} *</label>
                                <input className="crm-input"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="crm-form-group">
                                <label className="crm-label">{t('form.category', 'Категория')}</label>
                                <input className="crm-input"
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>

                            <div className="crm-form-group">
                                <label className="crm-label">{t('form.price')} *</label>
                                <input className="crm-input"
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>

                            <div className="crm-form-group">
                                <label className="crm-label">{t('form.costPrice')}</label>
                                <input className="crm-input"
                                    type="number"
                                    step="0.01"
                                    value={formData.cost_price}
                                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div className="crm-form-group">
                                <label className="crm-label">{t('form.stockQuantity')}</label>
                                <input className="crm-input"
                                    type="number"
                                    value={formData.stock_quantity}
                                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="crm-form-group">
                                <label className="crm-label">{t('form.minStockLevel')}</label>
                                <input className="crm-input"
                                    type="number"
                                    value={formData.min_stock_level}
                                    onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="crm-form-group">
                                <label className="crm-label">{t('form.sku')}</label>
                                <input className="crm-input"
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="crm-form-group">
                            <label className="crm-label">{t('form.photos', 'Фото товара')}</label>
                            <div className="crm-photo-upload mt-2">
                                <label className="crm-photo-grid flex flex-wrap gap-2">
                                    {formData.photos.map((photo: string, index: number) => (
                                        <div key={index} className="relative w-24 h-24 border rounded-lg overflow-hidden group">
                                            <img src={photo} alt="" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setFormData({ ...formData, photos: formData.photos.filter((_: string, i: number) => i !== index) })}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-pink-500 hover:text-pink-500 transition-colors cursor-pointer relative">
                                        <ImageIcon size={24} />
                                        <span className="text-[10px] mt-1">{t('form.upload', 'Загрузить')}</span>
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            accept="image/*"
                                            multiple
                                            onChange={async (e) => {
                                                const files = Array.from(e.target.files || []);
                                                if (files.length === 0) return;

                                                // Upload each file to the server
                                                try {
                                                    const uploadPromises = files.map(file => api.uploadFile(file, 'products'));
                                                    const results = await Promise.all(uploadPromises);
                                                    const newPhotoUrls = results.map(res => res.file_url);
                                                    setFormData({ ...formData, photos: [...formData.photos, ...newPhotoUrls] });
                                                } catch (error) {
                                                    console.error('Error uploading product photos:', error);
                                                    toast.error(t('form.uploadError', 'Ошибка загрузки фото'));
                                                }
                                            }}
                                        />
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="crm-form-group">
                            <label className="crm-label">{t('form.notes')}</label>
                            <textarea className="crm-textarea"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="crm-form-group">
                            <label className="crm-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                {t('form.isActive')}
                            </label>
                        </div>
                    </div>

                    <div className="crm-modal-footer">
                        <button type="button" className="crm-btn-secondary" onClick={onClose}>
                            {t('form.cancel')}
                        </button>
                        <button type="submit" className="crm-btn-primary">
                            {t('form.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const MovementDialog = ({ product, onClose, onSuccess }: any) => {
    const { t } = useTranslation('admin/products');
    const [formData, setFormData] = useState({
        product_id: product.id,
        movement_type: 'in',
        quantity: 0,
        reason: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/products/movements', formData);
            onSuccess();
        } catch (error) {
            console.error('Error creating movement:', error);
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <h2>{t('movement.title')}</h2>
                <p className="product-name">{product.name}</p>
                <form onSubmit={handleSubmit}>
                    <div className="crm-form-group">
                        <label className="crm-label">{t('movement.type')}</label>
                        <select
                            className="crm-select"
                            value={formData.movement_type}
                            onChange={(e) => setFormData({ ...formData, movement_type: e.target.value })}
                        >
                            <option value="in">{t('movement.types.in')}</option>
                            <option value="out">{t('movement.types.out')}</option>
                            <option value="adjustment">{t('movement.types.adjustment')}</option>
                        </select>
                    </div>

                    <div className="crm-form-group">
                        <label className="crm-label">{t('movement.quantity')}</label>
                        <input
                            type="number"
                            className="crm-input"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                            required
                        />
                    </div>

                    <div className="crm-form-group">
                        <label className="crm-label">{t('movement.reason')}</label>
                        <textarea
                            className="crm-textarea"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="crm-modal-footer">
                        <button type="button" className="crm-btn-secondary" onClick={onClose}>
                            {t('form.cancel')}
                        </button>
                        <button type="submit" className="crm-btn-primary">
                            {t('form.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ProductDetailDialog = ({ product, onClose }: any) => {
    const { t } = useTranslation('admin/products');
    const { currency } = useCurrency();
    const [movements, setMovements] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const parsedPhotos = Array.isArray(product.photos)
        ? product.photos
        : (typeof product.photos === 'string' && product.photos.startsWith('[')
            ? JSON.parse(product.photos)
            : (product.photos ? [product.photos] : []));

    const [activePhoto, setActivePhoto] = useState(parsedPhotos[0] || null);

    useEffect(() => {
        loadMovements();
        loadStats();
    }, [product.id]);

    const loadStats = async () => {
        try {
            const data = await api.getProductStats(product.id);
            setStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const loadMovements = async () => {
        try {
            setLoading(true);
            const response = await api.getProductMovements(product.id);
            setMovements(response.movements || []);
        } catch (error) {
            console.error('Error loading movements:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal modal-large" onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Photos */}
                    <div className="space-y-4">
                        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border relative group">
                            {activePhoto ? (
                                <img src={activePhoto} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <ImageIcon size={64} />
                                </div>
                            )}
                        </div>

                        {parsedPhotos && parsedPhotos.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {parsedPhotos.map((photo: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActivePhoto(photo)}
                                        className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${activePhoto === photo ? 'border-pink-500 scale-95' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                    >
                                        <img src={photo} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="bg-pink-50 rounded-2xl p-6 border border-pink-100">
                            <h3 className="font-bold text-pink-900 mb-2">{t('form.price')}</h3>
                            <p className="text-3xl font-black text-pink-600">{product.price} {currency}</p>
                            {product.cost_price > 0 && (
                                <p className="text-sm text-pink-400 mt-1">{t('detail.costPriceLabel', { price: product.cost_price, currency })}</p>
                            )}
                        </div>
                    </div>

                    {/* Right: Info & Analytics */}
                    <div className="space-y-6">
                        <div>
                            <span className="text-xs font-bold text-pink-500 uppercase tracking-wider">{product.category || t('detail.noCategory')}</span>
                            <h2 className="text-3xl font-black text-gray-900 leading-tight">{product.name_ru || product.name}</h2>
                            {product.sku && <p className="text-sm text-gray-500 mt-1 font-mono">SKU: {product.sku}</p>}
                        </div>

                        {product.notes && (
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-600 italic">"{product.notes}"</p>
                            </div>
                        )}

                        {/* Analytics Cards */}
                        {stats && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('analytics.totalSold', 'Продано всего')}</p>
                                    <p className="text-xl font-black text-gray-900">{stats.total_quantity_sold} шт.</p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('analytics.revenue', 'Выручка')}</p>
                                    <p className="text-xl font-black text-pink-600">{stats.total_revenue} {currency}</p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('analytics.last30Days', 'За 30 дней')}</p>
                                    <p className="text-xl font-black text-gray-900">{stats.last_30_days.quantity} шт.</p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('analytics.avgPrice', 'Ср. цена')}</p>
                                    <p className="text-xl font-black text-gray-900">{(stats.average_price || 0).toFixed(1)} {currency}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-pink-500" />
                                    {t('detail.movementHistory')}
                                </h3>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${product.stock_quantity > product.min_stock_level ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {t('detail.inStock', { count: product.stock_quantity })}
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                                {loading ? (
                                    <div className="py-8 text-center text-gray-400">{t('detail.loadingData')}</div>
                                ) : movements.length === 0 ? (
                                    <div className="py-8 text-center text-gray-400">{t('detail.noMovements')}</div>
                                ) : (
                                    movements.map((m: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.movement_type === 'in' ? 'bg-green-50 text-green-600' : m.movement_type === 'out' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {m.movement_type === 'in' ? '+' : m.movement_type === 'out' ? '-' : '~'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">
                                                        {m.movement_type === 'in' ? t('detail.movementIn') : m.movement_type === 'out' ? t('detail.movementOut') : t('detail.movementAdjustment')}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-gray-900">{m.quantity} шт.</p>
                                                {m.reason && <p className="text-[10px] text-gray-400 max-w-[120px] truncate" title={m.reason}>{m.reason}</p>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Products;
