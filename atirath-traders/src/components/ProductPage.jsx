// components/ProductPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { ArrowLeft, Building2, X, ChevronRight, Grid, List, Search, ShoppingCart, Check, ShoppingBag, Package, MapPin, Clock, Tag, Layers, Star, Shield, Truck, Award } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { database, ref, get } from '../firebase';
import { CURRENCIES } from '../data/currency';
import SingleProductBuyModal from './SingleProductBuyModal';
import CheckoutModal from './CheckoutModal';
import AddToCartConfigModal from './AddToCartConfigModal';
import { useCart } from './CartContext';

const ProductPage = ({ profile, globalSearchQuery = '', onGlobalSearchClear, isAuthenticated = false, onNewOrderSubmitted }) => {
  const { type: categoryId } = useParams();
  const navigate = useNavigate();
  const { addToCart, items: cartItems, setCheckoutProducts } = useCart();
  
  // States
  const [categoryData, setCategoryData] = useState(null);
  const [allCompanies, setAllCompanies] = useState({});
  const [allBrands, setAllBrands] = useState({});
  const [allProducts, setAllProducts] = useState({});
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [currency, setCurrency] = useState('AUTO');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isSingleProductModalOpen, setIsSingleProductModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isAddToCartConfigModalOpen, setIsAddToCartConfigModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductForConfig, setSelectedProductForConfig] = useState(null);
  const [checkoutProducts, setCheckoutProductsLocal] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailedProduct, setDetailedProduct] = useState(null);
  const [viewMode, setViewMode] = useState('companies');
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [viewStyle, setViewStyle] = useState('grid');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [cartStatus, setCartStatus] = useState({});
  const [showCartSuccess, setShowCartSuccess] = useState(false);
  const [addedProduct, setAddedProduct] = useState(null); // 🔥 FIXED: Store full product object instead of just name

  // Check mobile view
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch all data from Firebase
  useEffect(() => {
    if (!categoryId) return;
    fetchAllData();
  }, [categoryId]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [categoriesSnap, companiesSnap, brandsSnap, productsSnap] = await Promise.all([
        get(ref(database, 'categories')),
        get(ref(database, 'companies')),
        get(ref(database, 'brands')),
        get(ref(database, 'products'))
      ]);
      
      const fetchedCategories = categoriesSnap.exists() ? categoriesSnap.val() : {};
      const fetchedCompanies = companiesSnap.exists() ? companiesSnap.val() : {};
      const fetchedBrands = brandsSnap.exists() ? brandsSnap.val() : {};
      const fetchedProducts = productsSnap.exists() ? productsSnap.val() : {};

      setCategoryData(fetchedCategories[categoryId] || null);
      setAllCompanies(fetchedCompanies);
      setAllBrands(fetchedBrands);
      setAllProducts(fetchedProducts);

      const categoryProducts = Object.entries(fetchedProducts)
        .filter(([productId, productData]) => productData.categoryId === categoryId)
        .map(([productId, productData]) => ({
          id: productId,
          ...productData
        }));

      const uniqueCompanyIds = [...new Set(categoryProducts.map(p => p.companyId))];
      let filteredCompanies = [];
      
      if (uniqueCompanyIds.length > 0) {
        filteredCompanies = uniqueCompanyIds.map(companyId => ({
          id: companyId,
          ...fetchedCompanies[companyId]
        })).filter(c => c && c.id);
      } else {
        filteredCompanies = Object.entries(fetchedCompanies).map(([companyId, companyData]) => ({
          id: companyId,
          ...companyData
        }));
      }

      filteredCompanies = filteredCompanies.map(company => {
        const companyProducts = categoryProducts.filter(p => p.companyId === company.id);
        const brandIds = [...new Set(companyProducts.map(p => p.brandId).filter(Boolean))];
        return {
          ...company,
          productCount: companyProducts.length,
          brandCount: brandIds.length,
          hasBrands: brandIds.length > 0
        };
      });

      setCompanies(filteredCompanies);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
    }
  };

  // Filter products based on search query
  useEffect(() => {
    let filtered = products;

    if (globalSearchQuery.trim() !== '') {
      const searchLower = globalSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => (
        (product.name && product.name.toLowerCase().includes(searchLower)) ||
        (product.product_description && product.product_description.toLowerCase().includes(searchLower)) ||
        (product.companyName && product.companyName.toLowerCase().includes(searchLower)) ||
        (product.brandName && product.brandName.toLowerCase().includes(searchLower)) ||
        (product.origin && product.origin.toLowerCase().includes(searchLower)) ||
        (product.pack_type && product.pack_type.toLowerCase().includes(searchLower)) ||
        (product.shelf_life && product.shelf_life.toLowerCase().includes(searchLower)) ||
        (product.grades && product.grades.some(grade =>
          grade.grade && grade.grade.toLowerCase().includes(searchLower)
        ))
      ));
    }

    if (productSearchQuery.trim() !== '') {
      const searchLower = productSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => (
        (product.name && product.name.toLowerCase().includes(searchLower)) ||
        (product.product_description && product.product_description.toLowerCase().includes(searchLower)) ||
        (product.origin && product.origin.toLowerCase().includes(searchLower)) ||
        (product.pack_type && product.pack_type.toLowerCase().includes(searchLower))
      ));
    }

    setFilteredProducts(filtered);
  }, [globalSearchQuery, products, productSearchQuery]);

  // Filter brands based on search query
  useEffect(() => {
    if (brandSearchQuery.trim() !== '' && brands.length > 0) {
      const searchLower = brandSearchQuery.toLowerCase().trim();
      const filteredBrands = brands.filter(brand =>
        brand.name.toLowerCase().includes(searchLower)
      );
      setBrands(filteredBrands);
    } else {
      if (selectedCompany && allBrands && allProducts) {
        loadCompanyBrands();
      }
    }
  }, [brandSearchQuery]);

  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (!CURRENCIES[fromCurrency] || !CURRENCIES[toCurrency]) return amount;
    if (fromCurrency === toCurrency) return amount;
    
    let amountInUSD = fromCurrency === 'USD' ? amount : amount / CURRENCIES[fromCurrency].rateFromUSD;
    return amountInUSD * CURRENCIES[toCurrency].rateFromUSD;
  };

  // Load brands when company is selected
  useEffect(() => {
    if (selectedCompany && allBrands && allProducts) {
      loadCompanyBrands();
    }
  }, [selectedCompany, allBrands, allProducts]);

  const loadCompanyBrands = () => {
    if (!selectedCompany || !allBrands || !allProducts) return;
    
    try {
      const companyProducts = Object.entries(allProducts)
        .filter(([_, productData]) =>
          productData.categoryId === categoryId &&
          productData.companyId === selectedCompany.id
        )
        .map(([id, data]) => ({ id, ...data }));

      const brandedProducts = companyProducts.filter(p => p.brandId);
      const unbrandedProducts = companyProducts.filter(p => !p.brandId);
      const brandIds = [...new Set(brandedProducts.map(p => p.brandId))];
      
      const brandList = brandIds
        .map(brandId => {
          const brandData = allBrands[brandId];
          if (!brandData) return null;
          return {
            id: brandId,
            ...brandData,
            companyId: selectedCompany.id,
            companyName: selectedCompany.name,
            productCount: brandedProducts.filter(p => p.brandId === brandId).length,
            logo: getBrandImage(brandData)
          };
        })
        .filter(Boolean);

      if (brandList.length > 0) {
        setBrands(brandList);
        setViewMode('brands');
        return;
      }

      const productsList = unbrandedProducts.map(p => ({
        ...p,
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        brandName: null,
        localImage: p.image ? getLocalImagePath(p.image) : null
      }));
      
      setProducts(productsList);
      setFilteredProducts(productsList);
      setSelectedBrand(null);
      setViewMode('products');
    } catch (error) {
      console.error('Error loading company brands:', error);
      setBrands([]);
    }
  };

  // Load products when brand is selected
  useEffect(() => {
    if (selectedBrand && allProducts) {
      loadBrandProducts();
    }
  }, [selectedBrand, allProducts]);

  const loadBrandProducts = () => {
    if (!selectedBrand || !allProducts) return;
    
    try {
      let productsList;
      productsList = Object.entries(allProducts)
        .filter(([_, productData]) =>
          productData.categoryId === categoryId &&
          productData.companyId === selectedBrand.companyId &&
          productData.brandId === selectedBrand.id
        )
        .map(([id, data]) => ({
          id,
          ...data,
          companyId: selectedBrand.companyId,
          companyName: selectedBrand.companyName,
          brandName: selectedBrand.name,
          localImage: data.image ? getLocalImagePath(data.image) : null
        }));

      setProducts(productsList);
      setFilteredProducts(productsList);
      setViewMode('products');
      setProductSearchQuery('');
    } catch (error) {
      console.error('Error loading brand products:', error);
      setProducts([]);
      setFilteredProducts([]);
    }
  };

  // Get local image path for products
  const getLocalImagePath = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    if (imagePath.startsWith('/img/') || imagePath.startsWith('img/')) {
      return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    }
    return `/img/${imagePath}`;
  };

  // Get brand image with proper URL handling
  const getBrandImage = (brandData) => {
    if (!brandData) return null;
    if (brandData.logo) {
      return getLocalImagePath(brandData.logo);
    }
    if (brandData.image) {
      return getLocalImagePath(brandData.image);
    }
    return null;
  };

  // Get company logo with fallback
  const getCompanyLogo = (company) => {
    if (!company || !company.logo) return null;
    return getLocalImagePath(company.logo);
  };

  // Fallback image based on category
  const getFallbackImage = () => {
    const fallbackImages = {
      rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60',
      dry_fruits: 'https://images.unsplash.com/photo-1541636410410-0c5c8a9e6a8f?w=500&auto=format&fit=crop&q=60',
      dried_fruits: 'https://images.unsplash.com/photo-1541636410410-0c5c8a9e6a8f?w=500&auto=format&fit=crop&q=60',
      lentils: 'https://food.fnr.sndimg.com/content/dam/images/food/fullset/2016/2/15/0/HE_dried-legumes-istock-2_s4x3.jpg.rend.hgtvcom.1280.1280.85.suffix/1455572939649.webp',
      popcorn: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=60',
      tea: 'https://images.unsplash.com/photo-1571934811396-0ff49ca3a8a7?w=500&auto=format&fit=crop&q=60',
      beverages: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&auto=format&fit=crop&q=60',
      default: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&auto=format&fit=crop&q=60'
    };
    return fallbackImages[categoryId] || fallbackImages.default;
  };

  // ============================================
  // GET PRODUCT PRICE FOR DISPLAY
  // ============================================
  const getProductPrice = (product) => {
    const resolveCurrency = (baseCurrency) => {
      return currency === 'AUTO' ? baseCurrency : currency;
    };

    // SIEA RICE (INR range per 100kg) - CONVERT TO PER KG
    if (product.price?.min !== undefined && product.price?.max !== undefined) {
      const base = 'INR';
      const target = resolveCurrency(base);
      
      const minPerKg = product.price.min / 100;
      const maxPerKg = product.price.max / 100;
      
      const minConverted = convertCurrency(minPerKg, base, target);
      const maxConverted = convertCurrency(maxPerKg, base, target);
      
      const symbol = CURRENCIES[target]?.symbol || (target === 'INR' ? '₹' : '$');
      
      return `${symbol}${minConverted.toFixed(2)} - ${symbol}${maxConverted.toFixed(2)} / kg`;
    }

    // AKIL DRINKS (Ex-Mill USD)
    if (product["Ex-Mill_usd"] !== undefined) {
      const base = 'USD';
      const target = resolveCurrency(base);
      const value = convertCurrency(product["Ex-Mill_usd"], base, target);
      const symbol = CURRENCIES[target]?.symbol || '$';
      return `${symbol}${value.toFixed(2)} EX-MILL`;
    }

    // HERITAGE (price_usd_per_carton)
    if (product.price_usd_per_carton !== undefined) {
      const base = 'USD';
      const target = resolveCurrency(base);
      const value = convertCurrency(product.price_usd_per_carton, base, target);
      const symbol = CURRENCIES[target]?.symbol || '$';
      return `${symbol}${value.toFixed(2)} / carton`;
    }

    // NUT WALKER (fob_price_usd)
    if (product.fob_price_usd !== undefined) {
      const base = 'USD';
      const target = resolveCurrency(base);
      const value = convertCurrency(product.fob_price_usd, base, target);
      const symbol = CURRENCIES[target]?.symbol || '$';
      return `${symbol}${value.toFixed(2)} FOB`;
    }

    // Regular price field
    if (product.price !== undefined && typeof product.price === 'number') {
      const base = 'USD';
      const target = resolveCurrency(base);
      const value = convertCurrency(product.price, base, target);
      const symbol = CURRENCIES[target]?.symbol || '$';
      return `${symbol}${value.toFixed(2)}`;
    }

    return 'Contact for Price';
  };

  // ============================================
  // GET PRODUCT PRICE FOR CART
  // ============================================
  const getProductPriceForCart = (product) => {
    // SIEA RICE (INR range per 100kg) - CONVERT TO PER KG
    if (product.price?.min !== undefined && product.price?.max !== undefined) {
      return {
        type: 'rice',
        minPerKg: product.price.min / 100,
        maxPerKg: product.price.max / 100,
        min: product.price.min / 100,
        max: product.price.max / 100,
        unit: 'kg',
        currency: 'INR',
        display: `₹${(product.price.min / 100).toFixed(2)} - ₹${(product.price.max / 100).toFixed(2)} / kg`
      };
    }

    // AKIL DRINKS (Ex-Mill USD)
    if (product["Ex-Mill_usd"] !== undefined) {
      return {
        type: 'carton',
        value: product["Ex-Mill_usd"],
        currency: 'USD',
        display: `$${product["Ex-Mill_usd"].toFixed(2)} EX-MILL`,
        unit: 'carton'
      };
    }

    // HERITAGE (price_usd_per_carton)
    if (product.price_usd_per_carton !== undefined) {
      return {
        type: 'carton',
        value: product.price_usd_per_carton,
        currency: 'USD',
        display: `$${product.price_usd_per_carton.toFixed(2)} / carton`,
        unit: 'carton'
      };
    }

    // NUT WALKER (fob_price_usd)
    if (product.fob_price_usd !== undefined) {
      return {
        type: 'carton',
        value: product.fob_price_usd,
        currency: 'USD',
        display: `$${product.fob_price_usd.toFixed(2)} FOB`,
        unit: 'carton'
      };
    }

    // Regular price field
    if (product.price !== undefined && typeof product.price === 'number') {
      return {
        type: 'fixed',
        value: product.price,
        currency: 'USD',
        display: `$${product.price.toFixed(2)}`,
        unit: 'unit'
      };
    }

    return {
      type: 'unknown',
      display: 'Contact for Price'
    };
  };

  // ============================================
  // CHECK IF PRODUCT IS RICE
  // ============================================
  const isRiceProduct = (product) => {
    // Check by company name
    if (product.companyName?.toLowerCase().includes('siea')) {
      return true;
    }
    
    // Check by price structure
    if (product.price?.min !== undefined && product.price?.max !== undefined) {
      return true;
    }
    
    // Check by category
    if (categoryId === 'rice' || categoryData?.name?.toLowerCase().includes('rice')) {
      return true;
    }
    
    // Check by product name
    if (product.name?.toLowerCase().includes('rice') || 
        product.name?.toLowerCase().includes('basmati') ||
        product.name?.toLowerCase().includes('sona masoori')) {
      return true;
    }
    
    return false;
  };

  // ============================================
  // GET AVAILABLE GRADES FOR RICE - EXACT FORMAT FROM IMAGE
  // ============================================
  const getRiceGrades = (product) => {
    if (product.grades && Array.isArray(product.grades) && product.grades.length > 0) {
      return product.grades.map(grade => ({
        value: grade.grade || grade.name || "Standard",
        price: grade.price_inr || grade.price || "95.00",
        label: `${grade.grade || grade.name || "Standard"} - ₹${grade.price_inr || grade.price || "95"}/kg`
      }));
    }
    
    // Default grades if none in product data
    return [
      { value: "Premium", price: "120.00", label: "Premium - ₹120/kg" },
      { value: "Standard", price: "95.00", label: "Standard - ₹95/kg" },
      { value: "Economy", price: "75.00", label: "Economy - ₹75/kg" }
    ];
  };

  // ============================================
  // GET GRADES FOR DISPLAY - EXACT FORMAT FROM FIRST IMAGE
  // ============================================
  const getGradesDisplay = (product) => {
    if (product.grades && Array.isArray(product.grades) && product.grades.length > 0) {
      return product.grades.map(grade => {
        const gradeName = grade.grade || grade.name || "Standard";
        const gradePrice = grade.price_inr || grade.price || "";
        return (
          <div key={gradeName} style={{ color: '#1e293b', marginBottom: '2px' }}>
            {gradeName}{gradePrice ? ` - ₹${gradePrice}` : ''}
          </div>
        );
      });
    }
    return <div style={{ color: '#1e293b' }}>Standard Grade</div>;
  };

  // ============================================
  // GET PACKAGING DISPLAY - EXACT FORMAT FROM SECOND IMAGE
  // ============================================
  const getPackagingDisplay = (product) => {
    if (product.packaging) {
      if (typeof product.packaging === 'object') {
        if (product.packaging.units_per_carton && product.packaging.unit_weight_ml) {
          return `${product.packaging.units_per_carton} × ${product.packaging.unit_weight_ml} ml`;
        }
        if (product.packaging.units_per_carton && product.packaging.unit_weight_g) {
          return `${product.packaging.units_per_carton} × ${product.packaging.unit_weight_g} g`;
        }
        if (product.packaging.units_per_carton) {
          return `${product.packaging.units_per_carton} units/carton`;
        }
        if (product.packaging.type) {
          return product.packaging.type;
        }
      } else if (typeof product.packaging === 'string') {
        return product.packaging;
      }
    }
    
    if (product.pack_type) {
      return product.pack_type;
    }
    
    return "Standard Packaging";
  };

  // ============================================
  // GET PACKING OPTIONS FOR PRODUCT
  // ============================================
  const getPackingOptions = (product) => {
    if (product.pack_type) {
      return [
        { value: product.pack_type, label: product.pack_type }
      ];
    }
    
    if (product.packaging) {
      if (typeof product.packaging === 'string') {
        return [
          { value: product.packaging, label: product.packaging }
        ];
      } else if (typeof product.packaging === 'object') {
        if (product.packaging.type) {
          return [
            { value: product.packaging.type, label: product.packaging.type }
          ];
        }
        if (product.packaging.units_per_carton) {
          const display = product.packaging.unit_weight_ml 
            ? `${product.packaging.units_per_carton} × ${product.packaging.unit_weight_ml} ml`
            : product.packaging.unit_weight_g
              ? `${product.packaging.units_per_carton} × ${product.packaging.unit_weight_g} g`
              : `${product.packaging.units_per_carton} units/carton`;
          return [
            { value: display, label: display }
          ];
        }
      }
    }
    
    // Default options
    return [
      { value: "Standard Pack", label: "Standard Pack" },
      { value: "Bulk Pack", label: "Bulk Pack" },
      { value: "Retail Pack", label: "Retail Pack" }
    ];
  };

  // ============================================
  // GET QUANTITY OPTIONS FOR PRODUCT
  // ============================================
  const getQuantityOptions = (product) => {
    const isRice = isRiceProduct(product);
    
    if (isRice) {
      return [
        { value: "1", label: "1 kg", quantity: 1, unit: "kg" },
        { value: "5", label: "5 kg", quantity: 5, unit: "kg" },
        { value: "10", label: "10 kg", quantity: 10, unit: "kg" },
        { value: "25", label: "25 kg", quantity: 25, unit: "kg" },
        { value: "50", label: "50 kg", quantity: 50, unit: "kg" },
        { value: "100", label: "100 kg (1 Quintal)", quantity: 100, unit: "kg" },
        { value: "500", label: "500 kg (5 Quintals)", quantity: 500, unit: "kg" },
        { value: "1000", label: "1000 kg (1 Ton)", quantity: 1000, unit: "kg" }
      ];
    }
    
    // Check if carton-based product
    if (product.price_usd_per_carton || product.fob_price_usd || product["Ex-Mill_usd"]) {
      const unitsPerCarton = product.packaging?.units_per_carton || 48;
      return [
        { value: "1", label: `1 Carton (${unitsPerCarton} units)`, quantity: 1, unit: "carton" },
        { value: "5", label: `5 Cartons (${unitsPerCarton * 5} units)`, quantity: 5, unit: "carton" },
        { value: "10", label: `10 Cartons (${unitsPerCarton * 10} units)`, quantity: 10, unit: "carton" },
        { value: "20", label: `20 Cartons (${unitsPerCarton * 20} units)`, quantity: 20, unit: "carton" },
        { value: "50", label: `50 Cartons (${unitsPerCarton * 50} units)`, quantity: 50, unit: "carton" }
      ];
    }
    
    // Default for other products
    return [
      { value: "1", label: "1 Unit", quantity: 1, unit: "unit" },
      { value: "5", label: "5 Units", quantity: 5, unit: "unit" },
      { value: "10", label: "10 Units", quantity: 10, unit: "unit" },
      { value: "25", label: "25 Units", quantity: 25, unit: "unit" },
      { value: "50", label: "50 Units", quantity: 50, unit: "unit" },
      { value: "100", label: "100 Units", quantity: 100, unit: "unit" }
    ];
  };

  // ============================================
  // GET PER UNIT PRICE FOR CARTON PRODUCTS
  // ============================================
  const getPerUnitPrice = (product) => {
    if (product.price_usd_per_carton && product.packaging?.units_per_carton) {
      const perUnitUSD = product.price_usd_per_carton / product.packaging.units_per_carton;
      const perGramUSD = product.packaging.unit_weight_g
        ? (perUnitUSD / product.packaging.unit_weight_g)
        : null;
      return {
        perUnit: `$${perUnitUSD.toFixed(2)} per unit`,
        perGram: perGramUSD ? `$${perGramUSD.toFixed(4)}/g` : null
      };
    }

    if (product.fob_price_usd && product.packaging?.units_per_carton) {
      const perUnitUSD = product.fob_price_usd / product.packaging.units_per_carton;
      const perGramUSD = product.packaging.unit_weight_g
        ? (perUnitUSD / product.packaging.unit_weight_g)
        : null;
      return {
        perUnit: `$${perUnitUSD.toFixed(2)} per unit`,
        perGram: perGramUSD ? `$${perGramUSD.toFixed(4)}/g` : null
      };
    }
    return null;
  };

  // Get comprehensive product specifications
  const getProductSpecs = (product) => {
    const specs = [];
    const isRice = isRiceProduct(product);
    
    if (isRice) {
      // Rice-specific specifications
      if (product.origin) {
        specs.push({
          label: 'Origin',
          value: product.origin,
          icon: <MapPin size={18} className="me-2" style={{ color: '#10b981' }} />
        });
      }
      
      if (product.grades && product.grades.length > 0) {
        const gradeNames = product.grades.map(g => g.grade || g.name).join(', ');
        specs.push({
          label: 'Available Grades',
          value: gradeNames,
          icon: <Layers size={18} className="me-2" style={{ color: '#10b981' }} />
        });
      }
      
      if (product.price?.min !== undefined && product.price?.max !== undefined) {
        specs.push({
          label: 'Price Range',
          value: `₹${(product.price.min / 100).toFixed(2)} - ₹${(product.price.max / 100).toFixed(2)} / kg`,
          icon: <Tag size={18} className="me-2" style={{ color: '#10b981' }} />
        });
      }
    } else {
      // Non-rice specifications
      if (product.packaging) {
        if (typeof product.packaging === 'object') {
          if (product.packaging.units_per_carton && product.packaging.unit_weight_ml) {
            specs.push({
              label: 'Packaging',
              value: `${product.packaging.units_per_carton} × ${product.packaging.unit_weight_ml} ml`,
              icon: <Package size={18} className="me-2" style={{ color: '#10b981' }} />
            });
          } else if (product.packaging.units_per_carton && product.packaging.unit_weight_g) {
            specs.push({
              label: 'Packaging',
              value: `${product.packaging.units_per_carton} × ${product.packaging.unit_weight_g} g`,
              icon: <Package size={18} className="me-2" style={{ color: '#10b981' }} />
            });
          } else if (product.packaging.units_per_carton) {
            specs.push({
              label: 'Packaging',
              value: `${product.packaging.units_per_carton} units/carton`,
              icon: <Package size={18} className="me-2" style={{ color: '#10b981' }} />
            });
          } else if (product.packaging.type) {
            specs.push({
              label: 'Packaging',
              value: product.packaging.type,
              icon: <Package size={18} className="me-2" style={{ color: '#10b981' }} />
            });
          }
        } else if (typeof product.packaging === 'string') {
          specs.push({
            label: 'Packaging',
            value: product.packaging,
            icon: <Package size={18} className="me-2" style={{ color: '#10b981' }} />
          });
        }
      }
      
      if (product.pack_type && !specs.some(s => s.label === 'Packaging')) {
        specs.push({
          label: 'Pack Type',
          value: product.pack_type,
          icon: <Package size={18} className="me-2" style={{ color: '#10b981' }} />
        });
      }
      
      if (product.origin) {
        specs.push({
          label: 'Origin',
          value: product.origin,
          icon: <MapPin size={18} className="me-2" style={{ color: '#10b981' }} />
        });
      }
      
      if (product.shelf_life) {
        specs.push({
          label: 'Shelf Life',
          value: product.shelf_life,
          icon: <Clock size={18} className="me-2" style={{ color: '#10b981' }} />
        });
      }
      
      if (product.fob_price_usd !== undefined) {
        specs.push({
          label: 'FOB Price',
          value: `$${product.fob_price_usd.toFixed(2)} USD`,
          icon: <Tag size={18} className="me-2" style={{ color: '#10b981' }} />
        });
      }
      
      if (product.hsn_code) {
        specs.push({
          label: 'HSN Code',
          value: product.hsn_code,
          icon: <Tag size={18} className="me-2" style={{ color: '#10b981' }} />
        });
      }
    }
    
    return specs;
  };

  // Handle company selection
  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setSelectedBrand(null);
    setBrandSearchQuery('');
  };

  // Handle brand selection
  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand);
  };

  // Handle back to brands
  const handleBackToBrands = () => {
    setSelectedBrand(null);
    setProducts([]);
    setFilteredProducts([]);
    setViewMode('brands');
    setProductSearchQuery('');
  };

  // Handle back to companies
  const handleBackToCompanies = () => {
    setSelectedCompany(null);
    setSelectedBrand(null);
    setBrands([]);
    setProducts([]);
    setFilteredProducts([]);
    setViewMode('companies');
    setBrandSearchQuery('');
    setProductSearchQuery('');
  };

  // Handle back to all products
  const handleBackToAllProducts = () => {
    navigate('/all-products');
  };

  // Handle order now - single product
  const handleOrderNow = (product) => {
    setSelectedProduct({
      ...product,
      quantity: 1,
      category: categoryData?.name || categoryId,
      company: product.companyName,
      brand: product.brandName || 'General'
    });
    setIsSingleProductModalOpen(true);
  };

  // ============================================
  // 🔥 FIXED: HANDLE ADD TO CART WITH CONFIGURATION
  // ============================================
  const handleAddToCartClick = (product) => {
    console.log("📦 Opening add to cart config for product:", product);
    
    // Check if product is rice or not
    const isRice = isRiceProduct(product);
    
    // Get brand information
    const brandId = product.brandId || null;
    const brandName = product.brandName || 'General';
    
    // Prepare product for configuration modal with ALL data
    const productForConfig = {
      // Basic info
      id: product.id,
      name: product.name,
      companyName: product.companyName,
      companyId: product.companyId,
      brandName: brandName,
      brandId: brandId,
      category: categoryData?.name || categoryId,
      categoryId: categoryId,
      
      // Image
      image: product.localImage || product.image || getFallbackImage(),
      
      // Price fields
      price: product.price,
      price_usd_per_carton: product.price_usd_per_carton,
      fob_price_usd: product.fob_price_usd,
      "Ex-Mill_usd": product["Ex-Mill_usd"],
      
      // Product details
      packaging: product.packaging,
      pack_type: product.pack_type,
      grades: product.grades,
      origin: product.origin,
      shelf_life: product.shelf_life,
      hsn_code: product.hsn_code,
      product_description: product.product_description,
      
      // Flags
      isRice: isRice
    };
    
    console.log("✅ Product prepared for config modal:", productForConfig);
    setSelectedProductForConfig(productForConfig);
    setIsAddToCartConfigModalOpen(true);
  };

  // ============================================
  // 🔥 FIXED: HANDLE ADD TO CART AFTER CONFIGURATION
  // ============================================
  const handleAddToCartWithConfig = (productWithConfig) => {
    console.log("📦 ProductPage: Adding product to cart with configuration:", productWithConfig);
    
    // Get price info
    const priceInfo = getProductPriceForCart(productWithConfig);
    
    // Ensure all fields are present
    const enhancedProduct = {
      // Basic info
      id: productWithConfig.id,
      productId: productWithConfig.id,
      name: productWithConfig.name,
      
      // Brand info
      brandId: productWithConfig.brandId || null,
      brandName: productWithConfig.brandName || 'General',
      companyId: productWithConfig.companyId || null,
      companyName: productWithConfig.companyName || '',
      
      // Price info
      price: priceInfo,
      price_usd_per_carton: productWithConfig.price_usd_per_carton,
      fob_price_usd: productWithConfig.fob_price_usd,
      "Ex-Mill_usd": productWithConfig["Ex-Mill_usd"],
      
      // Image
      image: productWithConfig.image || getFallbackImage(),
      
      // Category
      category: productWithConfig.category || categoryData?.name || categoryId,
      categoryId: categoryId,
      
      // Quantity
      quantity: 1,
      
      // 🔥 SELECTED CONFIGURATION - WITH DISPLAY NAMES
      selectedGrade: productWithConfig.selectedGrade,
      selectedGradePrice: productWithConfig.selectedGradePrice,
      selectedGradeDisplay: productWithConfig.selectedGradeDisplay || productWithConfig.selectedGrade,
      selectedPacking: productWithConfig.selectedPacking,
      selectedQuantity: productWithConfig.selectedQuantity,
      quantityUnit: productWithConfig.quantityUnit || 'kg',
      isRice: productWithConfig.isRice || false,
      
      // Store complete selectedConfig object
      selectedConfig: {
        grade: productWithConfig.selectedGrade,
        gradePrice: productWithConfig.selectedGradePrice,
        gradeDisplay: productWithConfig.selectedGradeDisplay || productWithConfig.selectedGrade,
        packing: productWithConfig.selectedPacking,
        quantity: productWithConfig.selectedQuantity,
        quantityUnit: productWithConfig.quantityUnit || 'kg',
        isRice: productWithConfig.isRice || false
      },
      
      // Additional product info
      origin: productWithConfig.origin || '',
      packaging: productWithConfig.packaging || null,
      pack_type: productWithConfig.pack_type || '',
      grades: productWithConfig.grades || [],
      shelf_life: productWithConfig.shelf_life || '',
      
      // Store all Firebase data
      firebaseProductData: {
        ...productWithConfig,
        selectedConfig: {
          grade: productWithConfig.selectedGrade,
          gradePrice: productWithConfig.selectedGradePrice,
          gradeDisplay: productWithConfig.selectedGradeDisplay || productWithConfig.selectedGrade,
          packing: productWithConfig.selectedPacking,
          quantity: productWithConfig.selectedQuantity,
          quantityUnit: productWithConfig.quantityUnit || 'kg',
          isRice: productWithConfig.isRice || false
        }
      }
    };
    
    console.log("✅ Enhanced product ready for cart:", enhancedProduct);
    
    // Add to cart
    addToCart(enhancedProduct);
    
    // 🔥 FIXED: Store the entire product object for success message
    setAddedProduct(enhancedProduct);
    setShowCartSuccess(true);
    
    setTimeout(() => {
      setShowCartSuccess(false);
      setAddedProduct(null);
    }, 3000);
  };

  // Handle cart checkout - multiple products
  const handleCartCheckout = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty! Add some products first.');
      return;
    }
    
    // Prepare cart products for checkout
    const cartProductsForCheckout = cartItems.map(item => ({
      ...item,
      name: item.name || `Product ${item.id}`,
      price: item.price,
      quantity: item.quantity,
      image: item.image || getFallbackImage(),
      companyName: item.companyName || 'Unknown Company',
      brandName: item.brandName || 'General',
      unit: item.unit || 'unit',
      category: item.category || categoryData?.name || categoryId,
      
      // Include selected configuration
      selectedConfig: item.selectedConfig || null,
      selectedGrade: item.selectedGrade || null,
      selectedGradePrice: item.selectedGradePrice || null,
      selectedGradeDisplay: item.selectedGradeDisplay || null,
      selectedPacking: item.selectedPacking || null,
      selectedQuantity: item.selectedQuantity || 1,
      quantityUnit: item.quantityUnit || 'unit',
      isRice: item.isRice || false,
      cartItemId: item.cartItemId
    }));
    
    setCheckoutProductsLocal(cartProductsForCheckout);
    if (setCheckoutProducts) {
      setCheckoutProducts(cartProductsForCheckout);
    }
    setIsCheckoutModalOpen(true);
  };

  // Handle view details
  const handleViewDetails = (product) => {
    setDetailedProduct(product);
    setShowDetailsModal(true);
  };

  // Check if product is in cart
  const isProductInCart = (productId) => {
    return cartItems.some(item => item.id === productId);
  };

  // Get cart quantity for product
  const getCartQuantity = (productId) => {
    const item = cartItems.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  // Get total cart items count
  const getCartTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Handle successful order submission from modals
  const handleOrderSubmitted = () => {
    if (onNewOrderSubmitted) {
      onNewOrderSubmitted();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="product-page" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white',
        padding: '20px'
      }}>
        <div className="container py-5">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  // Category not found
  if (!categoryData) {
    return (
      <div className="product-page" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white',
        padding: '20px'
      }}>
        <div className="container py-5">
          <div className="text-center">
            <p className="h5 text-muted">Category not found: {categoryId}</p>
            <button className="btn btn-primary mt-3" onClick={handleBackToAllProducts}>
              Back to All Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render companies grid with logos - WITH WHITE TEXT
  const renderCompanies = () => (
    <div className="companies-grid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="h5" style={{ color: '#ffffff' }}>Companies</h3>
        <div className="badge bg-primary bg-opacity-25 px-3 py-2 rounded-pill" style={{ color: '#ffffff' }}>
          <strong style={{ color: '#ffffff' }}>{companies.length}</strong> company{companies.length !== 1 ? 'ies' : ''}
        </div>
      </div>
      
      {companies.length === 0 ? (
        <div className="no-products-message text-center py-5">
          <p className="h5" style={{ color: '#ffffff' }}>No companies available</p>
          <p className="text-sm mt-2" style={{ color: '#cccccc' }}>
            No companies offer products in this category yet.
          </p>
          <button
            className="btn btn-outline-accent btn-sm mt-3"
            onClick={handleBackToAllProducts}
          >
            Back to All Products
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {companies.map((company, index) => (
            <div key={company.id} className="col-6 col-md-4 col-lg-3" data-aos="fade-up" data-aos-delay={index % 4 * 100}>
              <div
                className="service-card glass p-3 text-center h-100"
                onClick={() => handleCompanySelect(company)}
                style={{ cursor: 'pointer' }}
              >
                <div className="company-logo-container mb-3">
                  {getCompanyLogo(company) ? (
                    <img
                      src={getCompanyLogo(company)}
                      alt={company.name}
                      className="company-logo rounded-circle"
                      style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.nextElementSibling || document.createElement('div');
                        fallback.className = 'fallback-logo';
                        fallback.innerHTML = '<Building2 className="w-12 h-12 text-muted" />';
                        e.target.parentNode.appendChild(fallback);
                      }}
                    />
                  ) : (
                    <div className="company-logo-placeholder">
                      <Building2 className="w-12 h-12" style={{ color: '#ffffff' }} />
                    </div>
                  )}
                </div>
                <h4 className="h6 fw-semibold mb-1" style={{ color: '#ffffff' }}>{company.name}</h4>
                <p className="text-xs mb-2" style={{ color: '#ffffff' }}>
                  <strong style={{ color: '#ffffff' }}>{company.productCount}</strong> product{company.productCount !== 1 ? 's' : ''}
                </p>
                {company.hasBrands && (
                  <div className="badge bg-info bg-opacity-25 px-2 py-1 rounded-pill" style={{ color: '#ffffff' }}>
                    <strong style={{ color: '#ffffff' }}>{company.brandCount}</strong> brand{company.brandCount !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render brands grid with logos - WITH WHITE TEXT
  const renderBrands = () => (
    <div className="brands-grid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="h5 mb-1" style={{ color: '#ffffff' }}>{selectedCompany.name}</h3>
          <p className="text-sm" style={{ color: '#cccccc' }}>Select a brand to view products</p>
        </div>
        <div className="badge bg-primary bg-opacity-25 px-3 py-2 rounded-pill" style={{ color: '#ffffff' }}>
          <strong style={{ color: '#ffffff' }}>{brands.length}</strong> brand{brands.length !== 1 ? 's' : ''} available
        </div>
      </div>
      
      {brands.length === 0 ? (
        <div className="no-products-message text-center py-5">
          <p className="h5" style={{ color: '#ffffff' }}>No brands available</p>
          <p className="text-sm mt-2" style={{ color: '#cccccc' }}>
            This company doesn't have any brands in this category.
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {brands.map(brand => {
            const brandLogo = brand.logo || getBrandImage(brand);
            return (
              <div key={brand.id} className="col-6 col-md-4 col-lg-3">
                <div
                  className="service-card glass p-4 text-center h-100"
                  onClick={() => handleBrandSelect(brand)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="brand-icon mb-3">
                    {brandLogo ? (
                      <div className="brand-logo-container">
                        <img
                          src={brandLogo}
                          alt={brand.name}
                          className="brand-logo rounded-circle"
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'fill',
                            border: '2px solid rgba(64, 150, 226, 0.3)'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.parentNode.querySelector('.brand-logo-placeholder') ||
                              document.createElement('div');
                            fallback.className = 'brand-logo-placeholder';
                            fallback.innerHTML = '<Building2 className="w-12 h-12" style="color: #ffffff" />';
                            if (!e.target.parentNode.querySelector('.brand-logo-placeholder')) {
                              e.target.parentNode.appendChild(fallback);
                            }
                          }}
                        />
                        {!brandLogo && (
                          <div className="brand-logo-placeholder">
                            <Building2 className="w-12 h-12" style={{ color: '#ffffff' }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="brand-icon-placeholder">
                        <Building2 className="w-12 h-12" style={{ color: '#ffffff' }} />
                      </div>
                    )}
                  </div>
                  <h4 className="h6 fw-semibold mb-1" style={{ color: '#ffffff' }}>{brand.name}</h4>
                  <p className="text-xs mb-0" style={{ color: '#ffffff' }}>
                    <strong style={{ color: '#ffffff' }}>{brand.productCount}</strong> product{brand.productCount !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-3">
                    <ChevronRight className="w-4 h-4" style={{ color: '#4096e2' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render products grid - WITH WHITE TEXT AND EXACT FORMATS FROM IMAGES
  const renderProducts = () => {
    const hasSearchQuery = globalSearchQuery.trim() !== '' || productSearchQuery.trim() !== '';
    const searchResultsCount = filteredProducts.length;
    const cartTotalItemsCount = getCartTotalItems();

    return (
      <div className="products-full-screen mt-4">
        {/* Products Header */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
          <div>
            {selectedBrand ? (
              <h3 className="h4 mb-1" style={{ color: '#ffffff' }}>{selectedBrand.name} Products</h3>
            ) : selectedCompany ? (
              <h3 className="h4 mb-1" style={{ color: '#ffffff' }}>{selectedCompany.name} Products</h3>
            ) : (
              <h3 className="h4 mb-1" style={{ color: '#ffffff' }}>{categoryData.name} Products</h3>
            )}
            {hasSearchQuery && (
              <p className="text-sm mb-0" style={{ color: '#cccccc' }}>
                Showing <strong style={{ color: '#ffffff' }}>{searchResultsCount}</strong> product{searchResultsCount !== 1 ? 's' : ''}
              </p>
            )}
            {!hasSearchQuery && (
              <p className="text-sm mb-0" style={{ color: '#cccccc' }}>
                <strong style={{ color: '#ffffff' }}>{filteredProducts.length}</strong> product{filteredProducts.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>
          
          <div className="d-flex align-items-center gap-3">
            {/* Cart Checkout Button */}
            {cartTotalItemsCount > 0 && (
              <button
                className="btn btn-success btn-sm d-flex align-items-center gap-2"
                onClick={handleCartCheckout}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <ShoppingBag size={18} />
                Checkout Cart (<strong>{cartTotalItemsCount}</strong>)
              </button>
            )}
            
            {/* Currency Dropdown */}
            <div className="currency-dropdown-container">
              <select
                className="form-select currency-dropdown"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{
                  background: 'rgba(31, 41, 55, 0.8)',
                  border: '1px solid rgba(64, 150, 226, 0.3)',
                  color: '#e6e6e6',
                  width: '200px',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
              >
                <option value="AUTO">Auto (Original Currency)</option>
                {Object.entries(CURRENCIES).map(([code, data]) => (
                  <option key={code} value={code}>
                    {data.symbol} {code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* 🔥 FIXED: Success Message - Shows correct cart quantity */}
        {showCartSuccess && addedProduct && (
          <div className="cart-success-message" style={{
            position: 'fixed',
            top: '100px',
            right: '20px',
            background: '#10b981',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'slideInRight 0.3s ease'
          }}>
            <Check size={20} />
            <div>
              <strong>{addedProduct.name}</strong> added to cart!
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                {/* 🔥 FIXED: Use getCartQuantity with product ID, not product name */}
                {getCartQuantity(addedProduct.id)} item(s) in cart
              </div>
            </div>
          </div>
        )}
        
        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="no-products-message text-center py-5">
            {hasSearchQuery ? (
              <>
                <p className="h5" style={{ color: '#ffffff' }}>No products found</p>
                <p className="text-sm mt-2" style={{ color: '#cccccc' }}>
                  No products match your search.
                </p>
                <button
                  className="btn btn-outline-accent btn-sm mt-3"
                  onClick={() => {
                    if (productSearchQuery) setProductSearchQuery('');
                    if (onGlobalSearchClear) onGlobalSearchClear();
                  }}
                >
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <p className="h5" style={{ color: '#ffffff' }}>No products available</p>
                <p className="text-sm mt-2" style={{ color: '#cccccc' }}>
                  {selectedBrand
                    ? `${selectedBrand.name} doesn't have any products listed yet.`
                    : `${selectedCompany.name} doesn't have any products listed yet.`}
                </p>
                <button
                  className="btn btn-outline-accent btn-sm mt-3"
                  onClick={handleBackToBrands}
                >
                  Back to Brands
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="row g-4">
            {filteredProducts.map(product => {
              const perUnitPriceData = getPerUnitPrice(product);
              const productImage = product.localImage ||
                product.image ||
                getLocalImagePath(product.image) ||
                getFallbackImage();
              const inCart = isProductInCart(product.id);
              const cartQuantity = getCartQuantity(product.id);
              const isRice = isRiceProduct(product);
              
              return (
                <div key={product.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                  <div className="product-card glass p-3 h-100 d-flex flex-column">
                    {/* Product Image */}
                    <div className="product-image-container mb-3 flex-shrink-0 position-relative">
                      <img
                        src={productImage}
                        alt={product.name}
                        className="product-image w-100"
                        style={{
                          height: '150px',
                          objectFit: 'contain',
                          borderRadius: '8px'
                        }}
                        onError={(e) => {
                          e.target.src = getFallbackImage();
                        }}
                      />
                      {inCart && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: '#10b981',
                          color: 'white',
                          borderRadius: '50%',
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}>
                          {cartQuantity}
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="product-info flex-grow-1 d-flex flex-column">
                      <h4 className="h6 fw-semibold mb-2 line-clamp-2" style={{ color: '#ffffff' }}>
                        {product.name}
                      </h4>
                      
                      {/* Brand Name */}
                      {product.brandName && product.brandName !== 'General' && (
                        <p className="text-xs mb-1" style={{ color: '#10b981' }}>
                          Brand: <strong style={{ color: '#10b981' }}>{product.brandName}</strong>
                        </p>
                      )}
                      
                      {/* Price Display */}
                      <p className="product-price fw-bold mb-2" style={{ color: '#4096e2' }}>
                        {getProductPrice(product)}
                      </p>
                      
                      {/* Product Details - Rice Specific */}
                      {isRice && (
                        <div className="product-details mb-2 small">
                          {product.origin && (
                            <div className="d-flex align-items-center mb-1" style={{ color: '#ffffff' }}>
                              <MapPin size={12} className="me-1" style={{ color: '#4096e2' }} />
                              <span>Origin: <strong style={{ color: '#ffffff' }}>{product.origin}</strong></span>
                            </div>
                          )}
                          {product.grades && product.grades.length > 0 && (
                            <div className="mb-1">
                              <div className="d-flex align-items-center mb-1" style={{ color: '#ffffff' }}>
                                <Layers size={12} className="me-1" style={{ color: '#4096e2' }} />
                                <span>Grades Available:</span>
                              </div>
                              <div className="ms-3" style={{ color: '#ffffff' }}>
                                {product.grades.map((grade, idx) => (
                                  <div key={idx} style={{ color: '#ffffff', marginBottom: '2px' }}>
                                    {grade.grade || grade.name || "Standard"} 
                                    {grade.price_inr && ` - ₹${grade.price_inr}`}
                                    {grade.price && !grade.price_inr && ` - ₹${grade.price}`}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Product Details - Non-Rice Specific */}
                      {!isRice && (
                        <div className="product-details mb-2 small">
                          {/* Packaging */}
                          {product.packaging && (
                            <div className="d-flex align-items-center mb-1" style={{ color: '#ffffff' }}>
                              <Package size={12} className="me-1" style={{ color: '#4096e2' }} />
                              <span>
                                Packaging: <strong style={{ color: '#ffffff' }}>
                                  {typeof product.packaging === 'object' 
                                    ? (product.packaging.units_per_carton && product.packaging.unit_weight_ml
                                      ? `${product.packaging.units_per_carton} × ${product.packaging.unit_weight_ml} ml`
                                      : product.packaging.units_per_carton && product.packaging.unit_weight_g
                                        ? `${product.packaging.units_per_carton} × ${product.packaging.unit_weight_g} g`
                                        : product.packaging.units_per_carton
                                          ? `${product.packaging.units_per_carton} units/carton`
                                          : product.packaging.type || 'Standard')
                                    : product.packaging}
                                </strong>
                              </span>
                            </div>
                          )}
                          
                          {/* Origin */}
                          {product.origin && (
                            <div className="d-flex align-items-center mb-1" style={{ color: '#ffffff' }}>
                              <MapPin size={12} className="me-1" style={{ color: '#4096e2' }} />
                              <span>Origin: <strong style={{ color: '#ffffff' }}>{product.origin}</strong></span>
                            </div>
                          )}
                          
                          {/* Pack Type */}
                          {product.pack_type && !product.packaging && (
                            <div className="d-flex align-items-center mb-1" style={{ color: '#ffffff' }}>
                              <Package size={12} className="me-1" style={{ color: '#4096e2' }} />
                              <span>Pack Type: <strong style={{ color: '#ffffff' }}>{product.pack_type}</strong></span>
                            </div>
                          )}
                          
                          {/* Shelf Life */}
                          {product.shelf_life && (
                            <div className="d-flex align-items-center mb-1" style={{ color: '#ffffff' }}>
                              <Clock size={12} className="me-1" style={{ color: '#4096e2' }} />
                              <span>Shelf Life: <strong style={{ color: '#ffffff' }}>{product.shelf_life}</strong></span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Action Buttons - Full Width and Clear */}
                      <div className="product-actions d-flex flex-column gap-2 mt-auto">
                        <button
                          className="btn btn-outline-primary btn-sm w-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(product);
                          }}
                          title="View Details"
                          style={{ 
                            color: '#ffffff', 
                            borderColor: '#4096e2',
                            backgroundColor: 'transparent',
                            padding: '8px 12px',
                            fontWeight: '500',
                            width: '100%'
                          }}
                        >
                          View Details
                        </button>
                        
                        <div className="d-flex gap-2 w-100">
                          <button
                            className="btn btn-info btn-sm flex-grow-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCartClick(product);
                            }}
                            style={{
                              background: inCart ? '#059669' : '#0dcaf0',
                              borderColor: inCart ? '#059669' : '#0dcaf0',
                              color: 'white',
                              padding: '8px 12px',
                              fontWeight: '500'
                            }}
                            title={inCart ? `${cartQuantity} item(s) in cart` : 'Add to Cart'}
                          >
                            <ShoppingCart className="w-4 h-4 me-1" />
                            {inCart ? `In Cart (${cartQuantity})` : 'Add to Cart'}
                          </button>
                          
                          <button
                            className="btn btn-success btn-sm flex-grow-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderNow(product);
                            }}
                            title="Order Now"
                            style={{
                              background: '#10b981',
                              borderColor: '#10b981',
                              color: 'white',
                              padding: '8px 12px',
                              fontWeight: '500'
                            }}
                          >
                            Order Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="product-page" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: '#e6e6e6',
      position: 'relative'
    }}>
      {/* Back Button */}
      <button
        className="back-button"
        style={{
          position: 'fixed',
          left: '20px',
          top: isMobile ? '120px' : '100px',
          zIndex: 100,
          background: '#0f3460',
          border: '1px solid #4096e2ff',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          color: '#e6e6e6'
        }}
        onClick={
          viewMode === 'products'
            ? (selectedBrand ? handleBackToBrands : handleBackToCompanies)
            : viewMode === 'brands'
              ? handleBackToCompanies
              : handleBackToAllProducts
        }
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Header */}
      <div className="product-header" style={{
        marginTop: isMobile ? '140px' : '120px',
        textAlign: 'center',
        padding: '0 20px'
      }}>
        <h1 className="h2 fw-bold text-center mb-4" style={{ color: '#4096e2' }}>{categoryData.name || categoryId}</h1>
        {categoryData.description && (
          <p className="lead text-center mb-5 px-3" style={{ color: '#4096e2ff' }}>
            {categoryData.description}
          </p>
        )}
      </div>

      {/* Main Content */}
      <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
        {viewMode === 'companies' && renderCompanies()}
        {viewMode === 'brands' && renderBrands()}
        {viewMode === 'products' && renderProducts()}
      </div>

      {/* Single Product Modal */}
      <SingleProductBuyModal
        isOpen={isSingleProductModalOpen}
        onClose={() => {
          setIsSingleProductModalOpen(false);
          setSelectedProduct(null);
          if (onNewOrderSubmitted) {
            onNewOrderSubmitted();
          }
        }}
        product={selectedProduct}
        profile={profile || null}
        onOrderSubmitted={handleOrderSubmitted}
      />

      {/* Add to Cart Configuration Modal */}
      <AddToCartConfigModal
        isOpen={isAddToCartConfigModalOpen}
        onClose={() => {
          setIsAddToCartConfigModalOpen(false);
          setSelectedProductForConfig(null);
        }}
        product={selectedProductForConfig}
        onAddToCart={handleAddToCartWithConfig}
        getRiceGrades={getRiceGrades}
        getPackingOptions={getPackingOptions}
        getQuantityOptions={getQuantityOptions}
        isRiceProduct={isRiceProduct}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => {
          setIsCheckoutModalOpen(false);
          setCheckoutProductsLocal([]);
        }}
        products={checkoutProducts}
        profile={profile || null}
        onOrderSubmitted={handleOrderSubmitted}
      />

      {/* Details Modal - Beautiful Design with Black Text and Green Accents */}
      {showDetailsModal && detailedProduct && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            color: '#1e293b',
            borderRadius: '28px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            maxWidth: '1000px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(16, 185, 129, 0.1) inset',
            animation: 'modalFadeIn 0.3s ease'
          }}>
            {/* Header with green gradient */}
            <div className="modal-header" style={{
              padding: '28px 32px',
              borderBottom: '1px solid rgba(16, 185, 129, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%)'
            }}>
              <div>
                <h5 className="modal-title" style={{ 
                  color: '#0f172a', 
                  fontSize: '2rem', 
                  fontWeight: '700',
                  marginBottom: '6px',
                  letterSpacing: '-0.02em'
                }}>
                  {detailedProduct.name}
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building2 size={18} style={{ color: '#10b981' }} />
                  <span style={{ color: '#475569', fontSize: '1rem', fontWeight: '500' }}>
                    {detailedProduct.brandName && detailedProduct.brandName !== 'General'
                      ? `${detailedProduct.brandName} • ${detailedProduct.companyName}`
                      : detailedProduct.companyName}
                  </span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)} style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#0f172a',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '32px' }}>
              <div className="row g-5">
                {/* Left Column - Image */}
                <div className="col-md-5">
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '24px',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.05)'
                  }}>
                    <img
                      src={detailedProduct.localImage || getLocalImagePath(detailedProduct.image) || getFallbackImage()}
                      alt={detailedProduct.name}
                      className="img-fluid rounded"
                      style={{ 
                        maxHeight: '350px', 
                        objectFit: 'contain', 
                        width: '100%',
                        filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))'
                      }}
                    />
                    
                    {/* Quick Info Badges - Green Theme */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      marginTop: '24px',
                      justifyContent: 'center',
                      flexWrap: 'wrap'
                    }}>
                      {detailedProduct.origin && (
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.08)',
                          padding: '8px 16px',
                          borderRadius: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          <MapPin size={16} style={{ color: '#10b981' }} />
                          <span style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: '500' }}>{detailedProduct.origin}</span>
                        </div>
                      )}
                      {detailedProduct.shelf_life && (
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.08)',
                          padding: '8px 16px',
                          borderRadius: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          <Clock size={16} style={{ color: '#10b981' }} />
                          <span style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: '500' }}>{detailedProduct.shelf_life}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Details */}
                <div className="col-md-7">
                  {/* Description - Black text on light green background */}
                  {detailedProduct.product_description && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.04)',
                      padding: '24px',
                      borderRadius: '20px',
                      marginBottom: '28px',
                      border: '1px solid rgba(16, 185, 129, 0.1)'
                    }}>
                      <p style={{ 
                        color: '#0f172a', 
                        lineHeight: '1.7', 
                        fontSize: '1.05rem',
                        margin: 0,
                        fontStyle: 'italic',
                        fontWeight: '400'
                      }}>
                        "{detailedProduct.product_description}"
                      </p>
                    </div>
                  )}
                  
                  {/* Price Card - Green accent */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    padding: '24px 28px',
                    borderRadius: '20px',
                    marginBottom: '32px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.1)'
                  }}>
                    <div style={{ fontSize: '0.95rem', color: '#047857', marginBottom: '8px', fontWeight: '500', letterSpacing: '0.5px' }}>
                      PRICE
                    </div>
                    <div style={{ 
                      color: '#0f172a', 
                      fontSize: '2.4rem', 
                      fontWeight: '700',
                      lineHeight: '1.2'
                    }}>
                      {getProductPrice(detailedProduct)}
                    </div>
                  </div>
                  
                  {/* Specifications - Black text on white */}
                  <div>
                    <h6 style={{ 
                      color: '#10b981', 
                      fontSize: '1.25rem', 
                      marginBottom: '20px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      letterSpacing: '-0.3px'
                    }}>
                      <Award size={22} />
                      Product Specifications
                    </h6>
                    
                    <div className="specs-grid" style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '14px' 
                    }}>
                      {(() => {
                        const specs = getProductSpecs(detailedProduct);
                        if (specs.length === 0) {
                          return (
                            <div style={{
                              textAlign: 'center',
                              padding: '30px',
                              background: '#f8fafc',
                              borderRadius: '16px',
                              border: '1px dashed rgba(16, 185, 129, 0.3)'
                            }}>
                              <p style={{ color: '#64748b', margin: 0 }}>No specifications available</p>
                            </div>
                          );
                        }
                        return specs.map((item, index) => (
                          <div key={index} className="spec-row" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            background: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid rgba(16, 185, 129, 0.15)',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                          }}>
                            <span className="spec-label" style={{ 
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '1rem',
                              fontWeight: '500'
                            }}>
                              {item.icon}
                              {item.label}:
                            </span>
                            <span className="spec-value" style={{ 
                              color: '#0f172a',
                              fontWeight: '600',
                              fontSize: '1rem',
                              background: '#f1f5f9',
                              padding: '6px 16px',
                              borderRadius: '30px',
                              border: '1px solid #e2e8f0'
                            }}>
                              {item.value || '—'}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer with Actions - Green theme buttons */}
            <div className="modal-footer" style={{
              padding: '24px 32px 32px',
              borderTop: '1px solid rgba(16, 185, 129, 0.15)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '16px',
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.02) 0%, transparent 100%)'
            }}>
              <button 
                className="btn" 
                onClick={() => setShowDetailsModal(false)}
                style={{
                  background: 'transparent',
                  border: '2px solid #e2e8f0',
                  color: '#475569',
                  padding: '12px 28px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                Close
              </button>
              
              <button
                className="btn"
                onClick={() => {
                  setShowDetailsModal(false);
                  handleAddToCartClick(detailedProduct);
                }}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '12px 28px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
                }}
              >
                <ShoppingCart size={18} />
                Add to Cart
              </button>
              
              <button 
                className="btn" 
                onClick={() => {
                  setShowDetailsModal(false);
                  handleOrderNow(detailedProduct);
                }}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '12px 28px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)'
                }}
              >
                Order Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add animation style */}
      <style>
        {`
          @keyframes modalFadeIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          
          .spec-row:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(16, 185, 129, 0.1) !important;
            border-color: rgba(16, 185, 129, 0.3) !important;
          }
          
          .close-btn:hover {
            background: rgba(16, 185, 129, 0.2) !important;
            transform: rotate(90deg);
          }
          
          button:hover {
            transform: translateY(-2px);
          }
        `}
      </style>
    </div>
  );
};

export default ProductPage;