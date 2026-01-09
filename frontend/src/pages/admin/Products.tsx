import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Package, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';
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
}

const Products = () => {
    const { t } = useTranslation('admin/products');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showMovementDialog, setShowMovementDialog] = useState(false);
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
            setProducts(response.products);
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
            await api.delete(`/products/${id}`);
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
                <h1>{t('title')}</h1>
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
                                <div className="crm-card-icon">
                                    <Package size={24} />
                                </div>
                                <div className="crm-card-title">
                                    <h3>{product.name_ru || product.name}</h3>
                                    {product.category && (
                                        <span className="crm-badge">{product.category}</span>
                                    )}
                                </div>
                            </div>

                            <div className="crm-card-body">
                                <div className="crm-detail-row">
                                    <span className="crm-detail-label">{t('form.price')}:</span>
                                    <span className="crm-detail-value">{product.price} AED</span>
                                </div>
                                <div className="crm-detail-row">
                                    <span className="crm-detail-label">{t('form.stockQuantity')}:</span>
                                    <span className={`crm-detail-value crm-stock-${getStockStatus(product)}`}>
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
        is_active: product?.is_active ?? true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (product) {
                await api.put(`/products/${product.id}`, formData);
            } else {
                await api.post('/products', formData);
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving product:', error);
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal modal-large" onClick={(e) => e.stopPropagation()}>
                <h2>{product ? t('edit') : t('addProduct')}</h2>
                <form onSubmit={handleSubmit}>
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
                            <label className="crm-label">{t('form.nameRu')}</label>
                            <input className="crm-input"
                                type="text"
                                value={formData.name_ru}
                                onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
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
            await api.post('/products/movements', formData);
            onSuccess();
        } catch (error) {
            console.error('Error creating movement:', error);
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <h2>{t('movement.title')}</h2>
                <p className="product-name">{product.name}</p>
                <form onSubmit={handleSubmit}>
                    <div className="crm-form-group">
                        <label className="crm-label">{t('movement.type')}</label>
                        <select className="crm-select"
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
                        <input className="crm-input"
                            type="number"
                            className="crm-input"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                            required
                        />
                    </div>

                    <div className="crm-form-group">
                        <label className="crm-label">{t('movement.reason')}</label>
                        <textarea className="crm-textarea"
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

export default Products;
