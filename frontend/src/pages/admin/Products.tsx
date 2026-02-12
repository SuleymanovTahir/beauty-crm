import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Package, TrendingUp, X, Image as ImageIcon, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { useCurrency } from '../../hooks/useSalonSettings';
import '../../styles/crm-pages.css';



interface Product {
    id: number;
    name: string;
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
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        // Параллельная загрузка для ускорения
        Promise.all([
            loadProducts(),
            loadCategories()
        ]).catch(error => {
            console.error('Error loading products data:', error);
        });
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

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-30" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
    };

    const filteredAndSortedProducts = useMemo(() => {
        return products.filter(p => {
            const name = (p.name || '').toLowerCase();
            const category = (p.category || '').toLowerCase();
            const search = searchQuery.toLowerCase();
            return name.includes(search) || category.includes(search);
        }).sort((a, b) => {
            if (!sortConfig) return 0;
            const { key, direction } = sortConfig;
            let aVal: any = a[key as keyof Product];
            let bVal: any = b[key as keyof Product];

            if (aVal! < bVal!) return direction === 'asc' ? -1 : 1;
            if (aVal! > bVal!) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [products, searchQuery, sortConfig]);

    const getStockStatus = (product: Product) => {
        if (product.stock_quantity === 0) return 'out-of-stock';
        if (product.stock_quantity <= product.min_stock_level) return 'low-stock';
        return 'in-stock';
    };

    return (
        <div className="crm-page crm-calendar-theme p-0 bg-gray-50/50 flex flex-col h-full overflow-hidden">
            <div className="px-8 py-6 bg-white border-b sticky top-0 z-20 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
                    </div>
                    <button className="crm-btn-primary h-10" onClick={() => setShowAddDialog(true)}>
                        <Plus size={18} />
                        {t('addProduct')}
                    </button>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="crm-select text-sm h-10 min-w-[180px]"
                        >
                            <option value="">{t('allCategories')}</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
                            <button
                                onClick={() => handleSort('price')}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center transition-all ${sortConfig?.key === 'price' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {t('form.price')} {getSortIcon('price')}
                            </button>
                            <button
                                onClick={() => handleSort('stock_quantity')}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center transition-all ${sortConfig?.key === 'stock_quantity' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {t('form.stockQuantity')} {getSortIcon('stock_quantity')}
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('search_placeholder')}
                            className="pl-9 pr-4 h-10 w-72 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredAndSortedProducts.map((product) => (
                            <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col">
                                <div
                                    className="aspect-square bg-gray-50 relative cursor-pointer overflow-hidden"
                                    onClick={() => {
                                        setSelectedProduct(product);
                                        setShowDetailDialog(true);
                                    }}
                                >
                                    {product.photos && product.photos.length > 0 ? (
                                        <img src={Array.isArray(product.photos) ? product.photos[0] : (product.photos as string)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                                            <Package size={48} strokeWidth={1} />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getStockStatus(product) === 'out-of-stock' ? 'bg-red-500 text-white' : getStockStatus(product) === 'low-stock' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
                                            {getStockStatus(product) === 'out-of-stock' ? t('stock_status.out_of_stock') : getStockStatus(product) === 'low-stock' ? t('stock_status.low_stock') : t('stock_status.in_stock')}
                                        </span>
                                    </div>
                                    {product.category && (
                                        <div className="absolute bottom-3 left-3">
                                            <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-gray-600 shadow-sm border border-gray-100">
                                                {product.category}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 flex-1 flex flex-col">
                                    <h3
                                        className="font-bold text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-pink-600 transition-colors"
                                        onClick={() => {
                                            setSelectedProduct(product);
                                            setShowDetailDialog(true);
                                        }}
                                    >
                                        {product.name}
                                    </h3>

                                    <div className="mt-auto flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('form.price')}</p>
                                            <p className="text-xl font-black text-pink-600 leading-tight">
                                                {product.price} <span className="text-xs font-bold">{currency}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('form.stockQuantity')}</p>
                                            <p className="text-sm font-bold text-gray-900">{product.stock_quantity}</p>
                                        </div>
                                    </div>

                                    <div className="h-1 w-full bg-gray-100 rounded-full mt-3 overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${getStockStatus(product) === 'in-stock' ? 'bg-green-500' : 'bg-orange-500'}`}
                                            style={{ width: `${Math.min(100, (product.stock_quantity / (product.min_stock_level || 1)) * 50)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                    <button
                                        className="p-2 hover:bg-white text-gray-400 hover:text-pink-600 rounded-xl transition-all shadow-sm hover:shadow border border-transparent hover:border-pink-100"
                                        onClick={() => {
                                            setSelectedProduct(product);
                                            setShowMovementDialog(true);
                                        }}
                                        title={t('movement.title')}
                                    >
                                        <TrendingUp size={16} />
                                    </button>
                                    <div className="flex gap-1">
                                        <button
                                            className="p-2 hover:bg-white text-gray-400 hover:text-blue-600 rounded-xl transition-all shadow-sm hover:shadow border border-transparent hover:border-blue-100"
                                            onClick={() => {
                                                setSelectedProduct(product);
                                                setShowEditDialog(true);
                                            }}
                                            title={t('edit')}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            className="p-2 hover:bg-white text-gray-400 hover:text-red-600 rounded-xl transition-all shadow-sm hover:shadow border border-transparent hover:border-red-100"
                                            onClick={() => handleDelete(product.id)}
                                            title={t('delete')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && filteredAndSortedProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <Package size={48} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{t('noProducts')}</h3>
                        <p className="text-gray-500">{searchQuery ? t('messages.noResults') : t('createFirst')}</p>
                    </div>
                )}
            </div>

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
                                <label className="crm-label">{t('form.category')}</label>
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
                            <label className="crm-label">{t('form.photos')}</label>
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
                                        <span className="text-[10px] mt-1">{t('form.upload')}</span>
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
                                                    toast.error(t('form.uploadError'));
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
                            <h2 className="text-3xl font-black text-gray-900 leading-tight">{product.name || product.name}</h2>
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
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('analytics.totalSold')}</p>
                                    <p className="text-xl font-black text-gray-900">{stats.total_quantity_sold} {t('unit_pcs')}</p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('analytics.revenue')}</p>
                                    <p className="text-xl font-black text-pink-600">{stats.total_revenue} {currency}</p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('analytics.last30Days', { count: 30 })}</p>
                                    <p className="text-xl font-black text-gray-900">{stats.last_30_days.quantity} {t('unit_pcs')}</p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('analytics.avgPrice')}</p>
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
                                                <p className="font-bold text-gray-900">{m.quantity} {t('unit_pcs')}</p>
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
