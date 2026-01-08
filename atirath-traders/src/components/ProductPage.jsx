import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, X, ChevronRight } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { database, ref, get } from '../firebase';
import { CURRENCIES } from '../data/currency'
import BuyModal from './BuyModal';

const ProductPage = ({ profile, globalSearchQuery = '', onGlobalSearchClear, isAuthenticated = false, onNewOrderSubmitted }) => {
  const { type: categoryId } = useParams();
  const navigate = useNavigate();
  
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
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailedProduct, setDetailedProduct] = useState(null);
  const [viewMode, setViewMode] = useState('companies');
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [lastViewMode, setLastViewMode] = useState('companies');
  const [lastSelectedCompany, setLastSelectedCompany] = useState(null);
  const [lastSelectedBrand, setLastSelectedBrand] = useState(null);
  
  // Responsive states
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Check responsive view
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      
      // Responsive breakpoints - Updated for iPad Mini
      setIsMobile(width < 576); // Phones
      setIsTablet(width >= 576 && width < 992); // Tablets and iPads (includes iPad Mini 768px)
      setIsDesktop(width >= 992); // Desktops
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent background scroll when details modal is open
  useEffect(() => {
    if (showDetailsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showDetailsModal]);

  // Fetch all data from Firebase
  useEffect(() => {
    if (!categoryId) return;
    fetchAllData();
  }, [categoryId]);

  // Clear search when view mode changes
  useEffect(() => {
    if (onGlobalSearchClear) {
      onGlobalSearchClear();
    }
  }, [viewMode, selectedCompany, selectedBrand]);

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
      
      // Set category data
      setCategoryData(fetchedCategories[categoryId] || null);
      setAllCompanies(fetchedCompanies);
      setAllBrands(fetchedBrands);
      setAllProducts(fetchedProducts);
      
      // Filter companies that have products in this category
      const categoryProducts = Object.entries(fetchedProducts)
        .filter(([productId, productData]) => productData.categoryId === categoryId)
        .map(([productId, productData]) => ({
          id: productId,
          ...productData
        }));
      
      // Get unique company IDs from products in this category
      const uniqueCompanyIds = [...new Set(categoryProducts.map(p => p.companyId))];
      let filteredCompanies = [];
      
      if (uniqueCompanyIds.length > 0) {
        filteredCompanies = uniqueCompanyIds.map(companyId => ({
          id: companyId,
          ...fetchedCompanies[companyId]
        })).filter(c => c && c.id);
      } else {
        // If no products, show all companies as fallback
        filteredCompanies = Object.entries(fetchedCompanies).map(([companyId, companyData]) => ({
          id: companyId,
          ...companyData
        }));
      }
      
      // Add product count and brand count to each company
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
    if (globalSearchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const searchLower = globalSearchQuery.toLowerCase().trim();
      const filtered = products.filter(product => {
        return (
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
        );
      });
      setFilteredProducts(filtered);
    }
  }, [globalSearchQuery, products]);

  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (!CURRENCIES[fromCurrency] || !CURRENCIES[toCurrency]) return amount;
    if (fromCurrency === toCurrency) return amount;
    
    let amountInUSD =
      fromCurrency === 'USD'
        ? amount
        : amount / CURRENCIES[fromCurrency].rateFromUSD;
    
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
        setLastSelectedCompany(selectedCompany);
        setLastViewMode('brands');
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
      setLastSelectedCompany(selectedCompany);
      setLastViewMode('products');
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
      setLastSelectedBrand(selectedBrand);
      setLastViewMode('products');
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

  // Dynamic price display based on product type
  const getProductPrice = (product) => {
    const resolveCurrency = (baseCurrency) => {
      return currency === 'AUTO' ? baseCurrency : currency;
    };
    
    if (product["Ex-Mill_usd"] !== undefined) {
      const base = 'USD';
      const target = resolveCurrency(base);
      const value = convertCurrency(product["Ex-Mill_usd"], base, target);
      return `${CURRENCIES[target].symbol}${value.toFixed(2)} EX-MILL`;
    }
    
    if (product.price_usd_per_carton !== undefined) {
      const base = 'USD';
      const target = resolveCurrency(base);
      const value = convertCurrency(product.price_usd_per_carton, base, target);
      return `${CURRENCIES[target].symbol}${value.toFixed(2)} / carton`;
    }
    
    if (product.fob_price_usd !== undefined) {
      const base = 'USD';
      const target = resolveCurrency(base);
      const value = convertCurrency(product.fob_price_usd, base, target);
      return `${CURRENCIES[target].symbol}${value.toFixed(2)} FOB`;
    }
    
    if (product.price?.min !== undefined && product.price?.max !== undefined) {
      const base = 'INR';
      const target = resolveCurrency(base);
      const min = convertCurrency(product.price.min, base, target);
      const max = convertCurrency(product.price.max, base, target);
      return `${CURRENCIES[target].symbol}${min.toFixed(0)} - ${CURRENCIES[target].symbol}${max.toFixed(0)} / ${product.price.unit}`;
    }
    
    if (product.price !== undefined && typeof product.price === 'number') {
      const base = 'USD';
      const target = resolveCurrency(base);
      const value = convertCurrency(product.price, base, target);
      return `${CURRENCIES[target].symbol}${value.toFixed(2)}`;
    }
    
    return 'Contact for Price';
  };

  // Calculate per unit price for USD products
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
    
    if (product.packaging) {
      if (typeof product.packaging === 'object') {
        if (product.packaging.units_per_carton) {
          specs.push({
            label: 'Units per Carton',
            value: product.packaging.units_per_carton
          });
        }
        if (product.packaging.unit_weight_g) {
          specs.push({
            label: 'Unit Weight',
            value: `${product.packaging.unit_weight_g} g`
          });
        }
        if (product.packaging.unit_weight_ml) {
          specs.push({
            label: 'Unit Volume',
            value: `${product.packaging.unit_weight_ml} ml`
          });
        }
      } else if (typeof product.packaging === 'string') {
        specs.push({
          label: 'Packaging',
          value: product.packaging
        });
      }
    }
    
    if (product.price_usd_per_carton !== undefined) {
      specs.push({
        label: 'Price per Carton',
        value: `$${product.price_usd_per_carton.toFixed(2)} USD`
      });
    }
    
    if (product.fob_price_usd !== undefined) {
      specs.push({
        label: 'FOB Price',
        value: `$${product.fob_price_usd.toFixed(2)} USD`
      });
    }
    
    if (product["Ex-Mill_usd"] !== undefined) {
      specs.push({
        label: 'EXW Price',
        value: `$${product["Ex-Mill_usd"].toFixed(2)} USD`
      });
    }
    
    if (product.origin) {
      specs.push({
        label: 'Origin',
        value: product.origin
      });
    }
    
    if (product.hsn_code) {
      specs.push({
        label: 'HSN Code',
        value: product.hsn_code
      });
    }
    
    if (product.shelf_life) {
      specs.push({
        label: 'Shelf Life',
        value: product.shelf_life
      });
    }
    
    if (product.pack_type) {
      specs.push({
        label: 'Pack Type',
        value: product.pack_type
      });
    }
    
    if (product.grades && product.grades.length > 0) {
      specs.push({
        label: 'Available Grades',
        value: product.grades.map(g => g.grade).join(', ')
      });
    }
    
    if (product.is_new) {
      specs.push({
        label: 'Status',
        value: 'New Product'
      });
    }
    
    return specs;
  };

  // Handle company selection
  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setSelectedBrand(null);
    if (onGlobalSearchClear) {
      onGlobalSearchClear();
    }
  };

  // Handle brand selection
  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand);
    if (onGlobalSearchClear) {
      onGlobalSearchClear();
    }
  };

  // Handle back to brands
  const handleBackToBrands = () => {
    setSelectedBrand(null);
    setProducts([]);
    setFilteredProducts([]);
    setViewMode('brands');
    if (onGlobalSearchClear) {
      onGlobalSearchClear();
    }
  };

  // Handle back to companies
  const handleBackToCompanies = () => {
    setSelectedCompany(null);
    setSelectedBrand(null);
    setBrands([]);
    setProducts([]);
    setFilteredProducts([]);
    setViewMode('companies');
    if (onGlobalSearchClear) {
      onGlobalSearchClear();
    }
  };

  // Handle back to all products
  const handleBackToAllProducts = () => {
    navigate('/all-products');
    if (onGlobalSearchClear) {
      onGlobalSearchClear();
    }
  };

  // Handle order now - ALLOWS BOTH SIGNED-IN AND NON-SIGNED-IN USERS
  const handleOrderNow = (product) => {
    setSelectedProduct({
      ...product,
      quantity: 1,
      category: categoryData?.name || categoryId,
      company: product.companyName,
      brand: product.brandName || 'General'
    });
    setIsBuyModalOpen(true);
  };

  // Handle view details
  const handleViewDetails = (product) => {
    setDetailedProduct(product);
    setShowDetailsModal(true);
  };

  // Dynamic column classes based on item count and screen size - FIXED for iPad Mini
  const getColumnClass = (items) => {
    const count = items.length;
    
    if (isMobile) {
      // Mobile: 1-2 columns
      if (count === 1) return 'col-12';
      if (count === 2) return 'col-12 col-sm-6';
      return 'col-12 col-sm-6 col-md-4';
    }
    
    if (isTablet) {
      // Tablet (including iPad Mini): 2-3 columns
      if (count === 1) return 'col-12 col-md-8 col-lg-6';
      if (count === 2) return 'col-12 col-md-6';
      if (count === 3) return 'col-12 col-md-6 col-lg-4';
      // For iPad Mini (768px), show 2 columns
      if (windowWidth >= 576 && windowWidth < 768) {
        return 'col-12 col-md-6'; // 2 columns for small tablets
      }
      return 'col-12 col-md-6 col-lg-4'; // 3 columns for larger tablets
    }
    
    // Desktop
    if (count === 1) return 'col-12 col-lg-8 col-xl-6';
    if (count === 2) return 'col-12 col-md-6 col-lg-6';
    if (count === 3) return 'col-12 col-md-6 col-lg-4';
    return 'col-12 col-md-6 col-lg-4 col-xl-3';
  };

  // Dynamic row justification
  const getRowJustifyClass = (items) => {
    const count = items.length;
    if (count === 1 || count === 2 || count === 3) {
      return 'justify-content-center';
    }
    return '';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="product-page">
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
      <div className="product-page">
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

  // Render companies grid with logos
  const renderCompanies = () => {
    const hasSearchQuery = globalSearchQuery.trim() !== '';
    let companiesToDisplay = companies;
    
    if (hasSearchQuery) {
      const searchLower = globalSearchQuery.toLowerCase().trim();
      companiesToDisplay = companies.filter(company =>
        company.name && company.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Determine column layout based on screen size and item count - FIXED for iPad Mini
    const getCompanyColumnClass = () => {
      if (isMobile) {
        if (companiesToDisplay.length === 1) return 'col-12 col-sm-8 col-md-6 col-lg-4';
        if (companiesToDisplay.length === 2) return 'col-12 col-sm-6 col-md-6 col-lg-4';
        return 'col-12 col-sm-6 col-md-4 col-lg-3';
      }
      
      if (isTablet) {
        // iPad Mini specific adjustments
        if (windowWidth >= 576 && windowWidth < 768) {
          // Small tablets: 2 columns
          if (companiesToDisplay.length === 1) return 'col-12 col-md-8';
          if (companiesToDisplay.length === 2) return 'col-12 col-md-6';
          return 'col-12 col-md-6';
        }
        // Larger tablets: 3 columns
        if (companiesToDisplay.length === 1) return 'col-12 col-md-8 col-lg-6 col-xl-5';
        if (companiesToDisplay.length === 2) return 'col-12 col-md-6 col-lg-6';
        if (companiesToDisplay.length === 3) return 'col-12 col-md-6 col-lg-4';
        return 'col-12 col-md-6 col-lg-4 col-xl-3';
      }
      
      // Desktop
      if (companiesToDisplay.length === 1) return 'col-12 col-lg-6 col-xl-4';
      if (companiesToDisplay.length === 2) return 'col-12 col-md-6 col-lg-6 col-xl-5';
      if (companiesToDisplay.length === 3) return 'col-12 col-md-6 col-lg-4';
      return 'col-12 col-md-6 col-lg-4 col-xl-3';
    };
    
    return (
      <div className="companies-grid mt-4">
        {/* Search Results Info for Companies */}
        {hasSearchQuery && (
          <div className="search-results-info mb-4 text-center">
            <span className="text-blue">
              Found {companiesToDisplay.length} company{companiesToDisplay.length !== 1 ? 's' : ''} for "{globalSearchQuery}"
            </span>
            {companiesToDisplay.length === 0 && (
              <button
                className="btn btn-sm btn-outline-blue ms-2"
                onClick={() => onGlobalSearchClear && onGlobalSearchClear()}
              >
                Clear Search
              </button>
            )}
          </div>
        )}
        
        {companiesToDisplay.length === 0 ? (
          <div className="no-products-message text-center py-5">
            {hasSearchQuery ? (
              <>
                <p className="h5 text-muted">No companies found</p>
                <p className="text-sm opacity-80 mt-2">
                  No companies match your search for "{globalSearchQuery}".
                </p>
                <button
                  className="btn btn-outline-blue btn-sm mt-3"
                  onClick={() => onGlobalSearchClear && onGlobalSearchClear()}
                >
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <p className="h5 text-muted">No companies available</p>
                <p className="text-sm opacity-80 mt-2">
                  No companies offer products in this category yet.
                </p>
                <button
                  className="btn btn-outline-blue btn-sm mt-3"
                  onClick={handleBackToAllProducts}
                >
                  Back to All Products
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="row g-4">
            {companiesToDisplay.map((company, index) => (
              <div key={company.id} className={getCompanyColumnClass()} data-aos="fade-up" data-aos-delay={index % 4 * 100}>
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
                        <Building2 className="w-12 h-12 text-muted" />
                      </div>
                    )}
                  </div>
                  <h4 className="h6 fw-semibold mb-1">{company.name}</h4>
                  <p className="text-xs text-muted mb-2">
                    {company.productCount} product{company.productCount !== 1 ? 's' : ''}
                  </p>
                  {company.hasBrands && (
                    <div className="badge bg-info bg-opacity-25 text-dark">
                      {company.brandCount} brand{company.brandCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render brands grid with logos
  const renderBrands = () => {
    const hasSearchQuery = globalSearchQuery.trim() !== '';
    let brandsToDisplay = brands;
    
    if (hasSearchQuery) {
      const searchLower = globalSearchQuery.toLowerCase().trim();
      brandsToDisplay = brands.filter(brand =>
        brand.name && brand.name.toLowerCase().includes(searchLower)
      );
    }
    
    return (
      <div className="brands-grid mt-4">
        <div className="d-flex align-items-center mb-4">
          <div>
            <h3 className="h5 mb-1">{selectedCompany.name}</h3>
            <p className="text-sm text-muted mb-0">Select a brand to view products</p>
          </div>
        </div>
        
        {/* Search Results Info for Brands */}
        {hasSearchQuery && (
          <div className="search-results-info mb-4 text-center">
            <span className="text-blue">
              Found {brandsToDisplay.length} brand{brandsToDisplay.length !== 1 ? 's' : ''} for "{globalSearchQuery}"
            </span>
            {brandsToDisplay.length === 0 && (
              <button
                className="btn btn-sm btn-outline-blue ms-2"
                onClick={() => onGlobalSearchClear && onGlobalSearchClear()}
              >
                Clear Search
              </button>
            )}
          </div>
        )}
        
        {brandsToDisplay.length === 0 ? (
          <div className="no-products-message text-center py-5">
            {hasSearchQuery ? (
              <>
                <p className="h5 text-muted">No brands found</p>
                <p className="text-sm opacity-80 mt-2">
                  No brands match your search for "{globalSearchQuery}".
                </p>
                <button
                  className="btn btn-outline-blue btn-sm mt-3"
                  onClick={() => onGlobalSearchClear && onGlobalSearchClear()}
                >
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <p className="h5 text-muted">No brands available</p>
                <p className="text-sm opacity-80 mt-2">
                  This company doesn't have any brands in this category.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className={`row g-4 ${getRowJustifyClass(brandsToDisplay)}`}>
            {brandsToDisplay.map(brand => {
              const brandLogo = brand.logo || getBrandImage(brand);
              return (
                <div key={brand.id} className={getColumnClass(brandsToDisplay)}>
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
                              border: '2px solid rgba(59, 130, 246, 0.3)'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = e.target.parentNode.querySelector('.brand-logo-placeholder') ||
                                document.createElement('div');
                              fallback.className = 'brand-logo-placeholder';
                              fallback.innerHTML = '<Building2 className="w-12 h-12 text-muted" />';
                              if (!e.target.parentNode.querySelector('.brand-logo-placeholder')) {
                                e.target.parentNode.appendChild(fallback);
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="brand-icon-placeholder">
                          <Building2 className="w-12 h-12 text-muted" />
                        </div>
                      )}
                    </div>
                    <h4 className="h6 fw-semibold mb-1">{brand.name}</h4>
                    <p className="text-xs text-muted mb-0">
                      {brand.productCount} product{brand.productCount !== 1 ? 's' : ''}
                    </p>
                    <div className="mt-3">
                      <ChevronRight className="w-4 h-4 text-blue" />
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

  // Render products grid - FIXED for iPad Mini and currency position
  const renderProducts = () => {
    const hasSearchQuery = globalSearchQuery.trim() !== '';
    const searchResultsCount = filteredProducts.length;
    
    // Calculate products per row based on screen size
    const getProductsPerRow = () => {
      if (isMobile) return 1;
      if (isTablet) {
        // iPad Mini (768px) should show 2 products per row
        if (windowWidth >= 576 && windowWidth < 768) return 2;
        return 3; // Larger tablets: 3 products
      }
      return 4; // Desktop: 4 products per row like first image
    };
    
    return (
      <div className="products-grid mt-4 position-relative">
        {/* Products Container */}
        {filteredProducts.length === 0 ? (
          <div className="no-products-message text-center py-5">
            {hasSearchQuery ? (
              <>
                <p className="h5 text-muted">No products found</p>
                <p className="text-sm opacity-80 mt-2">
                  No products match your search for "{globalSearchQuery}".
                </p>
                <button
                  className="btn btn-outline-blue btn-sm mt-3"
                  onClick={() => onGlobalSearchClear && onGlobalSearchClear()}
                >
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <p className="h5 text-muted">No products available</p>
                <p className="text-sm opacity-80 mt-2">
                  {selectedBrand
                    ? `${selectedBrand.name} doesn't have any products listed yet in ${categoryData.name}.`
                    : `${selectedCompany.name} doesn't have any products listed yet in ${categoryData.name}.`}
                </p>
                <button
                  className="btn btn-outline-blue btn-sm mt-3"
                  onClick={handleBackToBrands}
                >
                  Back to Brands
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={`row g-4 ${getRowJustifyClass(filteredProducts)}`}>
            {filteredProducts.map(product => {
              const perUnitPriceData = getPerUnitPrice(product);
              const productImage = product.localImage ||
                product.image ||
                getLocalImagePath(product.image) ||
                getFallbackImage();
              
              // Calculate image height based on screen size
              const getImageHeight = () => {
                if (isMobile) return '200px';
                if (isTablet) {
                  if (windowWidth >= 576 && windowWidth < 768) return '180px'; // iPad Mini
                  return '200px'; // Larger tablets
                }
                return '200px'; // Desktop like first image
              };
              
              // Calculate font size based on screen size
              const getTitleSize = () => {
                if (isMobile) return 'h6';
                if (isTablet) return 'h6';
                return 'h5'; // Desktop like first image
              };
              
              return (
                <div key={product.id} className={getColumnClass(filteredProducts)}>
                  <div
                    className="product-card glass p-3 h-100 d-flex flex-column"
                    data-aos="fade-up"
                    style={{
                      minHeight: isMobile ? '450px' : '500px' // Consistent card height
                    }}
                  >
                    {/* Product Image */}
                    <div className="product-image-container mb-3 flex-shrink-0">
                      <img
                        src={productImage}
                        alt={product.name}
                        className="product-image w-100"
                        style={{
                          height: getImageHeight(),
                          objectFit: 'contain',
                          borderRadius: '8px',
                          backgroundColor: '#f8f9fa' // White background for images like first image
                        }}
                        onError={(e) => {
                          e.target.src = getFallbackImage();
                        }}
                      />
                    </div>
                    
                    {/* Product Info */}
                    <div className="product-info flex-grow-1 d-flex flex-column">
                      <h4
                        className={`fw-semibold mb-2 line-clamp-2 ${getTitleSize()}`}
                        style={{
                          color: '#333', // Dark text like first image
                          minHeight: '3em' // Fixed height for title
                        }}
                      >
                        {product.name}
                      </h4>
                      
                      {/* Product Description */}
                      {product.product_description && (
                        <p className="text-sm text-muted mb-2 line-clamp-2" style={{ minHeight: '3em' }}>
                          {product.product_description}
                        </p>
                      )}
                      
                      {/* Price Display */}
                      <div className="mb-3">
                        <p className="product-price fw-bold text-success mb-1">
                          {getProductPrice(product)}
                        </p>
                        {perUnitPriceData && (
                          <small className="text-success d-block">
                            {perUnitPriceData.perUnit}
                            {perUnitPriceData.perGram && ` (${perUnitPriceData.perGram})`}
                          </small>
                        )}
                      </div>
                      
                      {/* Product Specs - Simplified like first image */}
                      <div className="product-specs text-xs text-muted mb-3 flex-grow-1">
                        {/* Packaging - Like first image format */}
                        {product.packaging && (
                          <div className="packaging-info mb-2">
                            <small className="d-block">
                              <strong>Packaging:</strong>{' '}
                              {typeof product.packaging === 'string'
                                ? product.packaging
                                : product.packaging.units_per_carton && product.packaging.unit_weight_g
                                  ? `${product.packaging.units_per_carton} × ${product.packaging.unit_weight_g} g`
                                  : product.packaging.units_per_carton && product.packaging.unit_weight_ml
                                    ? `${product.packaging.units_per_carton} × ${product.packaging.unit_weight_ml} ml`
                                    : 'Contact for details'}
                            </small>
                          </div>
                        )}
                        
                        {/* Origin - Like first image */}
                        {product.origin && (
                          <small className="d-block mb-1">
                            <strong>Origin:</strong> {product.origin}
                          </small>
                        )}
                        
                        {/* Shelf Life - Like first image */}
                        {product.shelf_life && (
                          <small className="d-block mt-2">
                            <strong>Shelf Life:</strong> {product.shelf_life}
                          </small>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="product-actions d-flex gap-2 mt-auto">
                        <button
                          className="btn btn-outline-primary btn-sm flex-grow-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(product);
                          }}
                          style={{
                            borderColor: '#3b82f6', // Blue border
                            color: '#3b82f6',
                            fontWeight: '600'
                          }}
                        >
                          View Details
                        </button>
                        <button
                          className="btn btn-success btn-sm flex-grow-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOrderNow(product);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            fontWeight: '600'
                          }}
                        >
                          Order Now
                        </button>
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

  // Calculate top position for back button based on screen size
  const getBackButtonTop = () => {
    if (isMobile) return '80px';
    if (isTablet) return '80px';
    return '100px';
  };

  // Calculate top position for currency selector
  const getCurrencyTop = () => {
    if (isMobile) return '80px';
    if (isTablet) return '80px';
    return '100px';
  };

  return (
    <div className="product-page">
      {/* Main Content */}
      <div className="product-main-content">
        {/* Back Button - Left Side */}
        <button
          className="back-button"
          style={{ top: getBackButtonTop() }}
          onClick={() => {
            if (viewMode === 'products') {
              if (selectedBrand) {
                handleBackToBrands();
              } else {
                handleBackToCompanies();
              }
            } else if (viewMode === 'brands') {
              handleBackToCompanies();
            } else {
              handleBackToAllProducts();
            }
            if (onGlobalSearchClear) {
              onGlobalSearchClear();
            }
          }}
          title={
            viewMode === 'products' ? 'Back to Brands' :
              viewMode === 'brands' ? 'Back to Companies' :
                'Back to All Products'
          }
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        {/* Currency Selector - Top Right Corner */}
        {viewMode === 'products' && (
          <div 
            className="currency-selector-container"
            style={{
              position: 'fixed',
              right: '20px',
              top: getCurrencyTop(),
              zIndex: 100
            }}
          >
            <select
              className="form-select form-select-sm currency-dropdown"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                background: 'rgba(31, 41, 55, 0.9)',
                border: '1px solid rgba(59, 130, 246, 0.5)',
                color: '#e6e6e6',
                borderRadius: '8px',
                padding: '8px 12px',
                minWidth: '150px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                fontWeight: '600'
              }}
            >
              <option value="AUTO">Currency</option>
              {Object.keys(CURRENCIES).map(code => (
                <option key={code} value={code}>
                  {code} ({CURRENCIES[code].symbol})
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Header */}
        <div className="product-header" style={{ 
          marginTop: isMobile ? '120px' : 
                    isTablet ? '100px' : '120px',
          paddingTop: viewMode === 'products' ? '20px' : '0'
        }}>
          <h1 className="h2 fw-bold text-center blue mb-4">{categoryData.name || categoryId}</h1>
          {categoryData.description && (
            <p className="lead text-center mb-5 px-3" style={{ color: '#3b82f6' }}>
              {categoryData.description}
            </p>
          )}
        </div>
        
        {/* Search Results Info for Products View */}
        {viewMode === 'products' && globalSearchQuery.trim() !== '' && (
          <div className="search-results-info text-center mb-4">
            <span className="text-blue">
              Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} for "{globalSearchQuery}"
            </span>
            {filteredProducts.length === 0 && (
              <button
                className="btn btn-sm btn-outline-blue ms-2"
                onClick={() => onGlobalSearchClear && onGlobalSearchClear()}
              >
                Clear Search
              </button>
            )}
          </div>
        )}
        
        {/* Render current view */}
        {viewMode === 'companies' && renderCompanies()}
        {viewMode === 'brands' && renderBrands()}
        {viewMode === 'products' && renderProducts()}
      </div>
      
      {/* Buy Modal */}
      <BuyModal
        isOpen={isBuyModalOpen}
        onClose={() => {
          setIsBuyModalOpen(false);
          setSelectedProduct(null);
          if (onNewOrderSubmitted) {
            onNewOrderSubmitted();
          }
        }}
        product={selectedProduct}
        profile={profile || null}
      />
      
      {/* Details Modal */}
      {showDetailsModal && detailedProduct && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">{detailedProduct.name}</h5>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <img
                    src={detailedProduct.localImage || getLocalImagePath(detailedProduct.image) || getFallbackImage()}
                    alt={detailedProduct.name}
                    className="img-fluid rounded"
                    style={{ maxHeight: '300px', objectFit: 'contain', width: '100%' }}
                  />
                </div>
                <div className="col-md-6">
                  {/* Brand and Company Info */}
                  <div className="mb-3">
                    <h6 className="text-muted">
                      {detailedProduct.brandName && detailedProduct.brandName !== 'General'
                        ? `${detailedProduct.brandName} • ${detailedProduct.companyName}`
                        : detailedProduct.companyName}
                    </h6>
                  </div>
                  
                  {/* Product Description */}
                  {detailedProduct.product_description && (
                    <div className="mb-4">
                      <p className="text-sm">{detailedProduct.product_description}</p>
                    </div>
                  )}
                  
                  {/* Price Info */}
                  <div className="mb-4">
                    <h6 className="text-success fw-bold">
                      {getProductPrice(detailedProduct)}
                    </h6>
                    {getPerUnitPrice(detailedProduct) && (
                      <small className="text-success">
                        {getPerUnitPrice(detailedProduct).perUnit}
                        {getPerUnitPrice(detailedProduct).perGram &&
                          ` (${getPerUnitPrice(detailedProduct).perGram})`}
                      </small>
                    )}
                  </div>
                  
                  {/* Product Specifications */}
                  <div className="mb-4">
                    <h6>Product Specifications</h6>
                    <div className="product-specs-container">
                      {(() => {
                        const specs = getProductSpecs(detailedProduct);
                        if (specs.length === 0) {
                          return (
                            <div className="text-center py-3">
                              <p className="text-muted mb-0">No specifications available</p>
                            </div>
                          );
                        }
                        return (
                          <div className="specs-grid">
                            {specs.map((item, index) => (
                              <div key={index} className="spec-row">
                                <span className="spec-label">{item.label}</span>
                                <span className="spec-value">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Grades Table for Rice Products */}
                  {detailedProduct.grades && detailedProduct.grades.length > 0 && (
                    <div className="mb-4">
                      <h6>Available Grades & Prices</h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead>
                            <tr>
                              <th>Grade</th>
                              <th>Price (₹ per 100 qtls)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailedProduct.grades.map((grade, idx) => (
                              <tr key={idx}>
                                <td>{grade.grade}</td>
                                <td className="fw-bold">₹{grade.price_inr * 100}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {/* Detailed Packaging Information */}
                  {detailedProduct.packaging && typeof detailedProduct.packaging === 'object' && (
                    <div className="mb-4">
                      <h6>Packaging Details</h6>
                      <div className="row">
                        {detailedProduct.packaging.units_per_carton && (
                          <div className="col-6 mb-3">
                            <div className="info-box">
                              <div>
                                <small className="text-muted">Units per Carton</small>
                                <p className="mb-0 fw-bold">{detailedProduct.packaging.units_per_carton}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {detailedProduct.packaging.unit_weight_g && (
                          <div className="col-6 mb-3">
                            <div className="info-box">
                              <div>
                                <small className="text-muted">Unit Weight</small>
                                <p className="mb-0 fw-bold">{detailedProduct.packaging.unit_weight_g}g</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {detailedProduct.packaging.unit_weight_ml && (
                          <div className="col-6 mb-3">
                            <div className="info-box">
                              <div>
                                <small className="text-muted">Unit Volume</small>
                                <p className="mb-0 fw-bold">{detailedProduct.packaging.unit_weight_ml}ml</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
              <button className="btn btn-success" onClick={() => {
                setShowDetailsModal(false);
                handleOrderNow(detailedProduct);
              }}>
                Order Now
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS Styles */}
      <style>{`
        .product-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          color: #e6e6e6;
          padding-bottom: 2rem;
        }
        
        .product-main-content {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
        }
        
        .back-button {
          position: fixed;
          left: 20px;
          top: 100px;
          z-index: 100;
          background: #0f3460;
          border: 1px solid #3b82f6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #e6e6e6;
        }
        
        .back-button:hover {
          background: #3b82f6;
          transform: translateX(-2px);
        }
        
        .currency-selector-container {
          position: fixed;
          right: 20px;
          z-index: 100;
          animation: fadeInDown 0.3s ease-out;
        }
        
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .currency-dropdown {
          background: rgba(31, 41, 55, 0.9) !important;
          border: 1px solid rgba(59, 130, 246, 0.5) !important;
          color: #e6e6e6 !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          min-width: 150px !important;
          backdrop-filter: blur(10px) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
        }
        
        .currency-dropdown:hover {
          border-color: #3b82f6 !important;
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3) !important;
        }
        
        .currency-dropdown:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25) !important;
          outline: none !important;
        }
        
        .product-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        /* Blue color class */
        .blue {
          color: #3b82f6 !important;
        }
        
        .text-blue {
          color: #3b82f6 !important;
        }
        
        .btn-outline-blue {
          border-color: #3b82f6;
          color: #3b82f6;
          background: transparent;
        }
        
        .btn-outline-blue:hover {
          background-color: #3b82f6;
          color: white;
        }
        
        /* Search results info */
        .search-results-info {
          font-size: 0.9rem;
          color: #3b82f6;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        /* Brand logo styles */
        .brand-logo-container {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }
        
        .brand-logo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          border: 2px solid rgba(59, 130, 246, 0.3);
        }
        
        .brand-logo-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px dashed rgba(59, 130, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(59, 130, 246, 0.1);
        }
        
        .brand-icon-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px dashed rgba(59, 130, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(59, 130, 246, 0.1);
          margin: 0 auto;
        }
        
        /* Product Card Styles - Updated to match first image */
        .product-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          background: rgba(255, 255, 255, 0.95); /* White background like first image */
          border: 1px solid rgba(203, 213, 225, 0.5); /* Light border */
          color: #333; /* Dark text for better readability */
        }
        
        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          border-color: #3b82f6;
        }
        
        .product-image-container {
          overflow: hidden;
          border-radius: 8px;
          background: #f8f9fa; /* Light background for image container */
        }
        
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.5s ease;
        }
        
        .product-card:hover .product-image {
          transform: scale(1.05);
        }
        
        .product-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 0.5rem 0;
        }
        
        .product-price {
          font-size: 1.1rem;
          color: #10b981;
        }
        
        .product-specs {
          font-size: 0.8rem;
          color: #6b7280;
        }
        
        .packaging-info {
          background: rgba(59, 130, 246, 0.1);
          padding: 8px;
          border-radius: 6px;
          border-left: 3px solid #3b82f6;
        }
        
        .badge {
          font-size: 0.7rem;
          padding: 4px 8px;
        }
        
        .bg-info {
          background-color: rgba(59, 130, 246, 0.2) !important;
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #3b82f6 !important;
        }
        
        .product-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }
        
        .btn-outline-primary {
          border-color: #3b82f6;
          color: #3b82f6;
          background: transparent;
        }
        
        .btn-outline-primary:hover {
          background-color: #3b82f6;
          color: white;
        }
        
        .btn-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: white;
        }
        
        .btn-success:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }
        
        .btn-secondary {
          background: rgba(107, 114, 128, 0.3);
          border: 1px solid rgba(107, 114, 128, 0.5);
          color: #e6e6e6;
        }
        
        .btn-secondary:hover {
          background: rgba(107, 114, 128, 0.5);
        }
        
        /* Service Card Styles */
        .service-card {
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          transition: all 0.3s ease;
          background: rgba(31, 41, 55, 0.8);
          color: #e6e6e6;
        }
        
        .service-card:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
          background: rgba(31, 41, 55, 1);
        }
        
        /* Company logo styles */
        .company-logo-container {
          width: 80px;
          height: 80px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .company-logo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          border: 2px solid rgba(59, 130, 246, 0.3);
        }
        
        .company-logo-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px dashed rgba(59, 130, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(59, 130, 246, 0.1);
        }
        
        .fallback-logo {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 50%;
          border: 2px dashed rgba(59, 130, 246, 0.3);
        }
        
        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1050;
          padding: 20px;
        }
        
        .modal-content {
          background: linear-gradient(135deg, #1e293b 0%, #1a202c 100%);
          border-radius: 16px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.7);
          border: 2px solid rgba(59, 130, 246, 0.4);
          color: #f8fafc;
          animation: modalSlideIn 0.3s ease-out;
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .modal-header {
          padding: 1.5rem 2rem;
          border-bottom: 2px solid rgba(59, 130, 246, 0.3);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(30, 41, 59, 0.95);
          border-radius: 16px 16px 0 0;
        }
        
        .modal-title {
          margin: 0;
          font-weight: 700;
          font-size: 1.5rem;
          color: #f1f5f9;
          letter-spacing: 0.5px;
        }
        
        .close-btn {
          background: rgba(59, 130, 246, 0.2);
          border: 2px solid rgba(59, 130, 246, 0.4);
          font-size: 1.5rem;
          cursor: pointer;
          color: #e6e6e6;
          padding: 8px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
        }
        
        .close-btn:hover {
          background: rgba(59, 130, 246, 0.4);
          color: #ffffff;
          transform: rotate(90deg);
          border-color: #3b82f6;
        }
        
        .modal-body {
          padding: 2rem;
          background: rgba(26, 32, 44, 0.9);
        }
        
        .modal-body h6 {
          color: #dbeafe;
          font-weight: 600;
          margin-bottom: 1rem;
          font-size: 1.1rem;
          border-bottom: 2px solid rgba(59, 130, 246, 0.2);
          padding-bottom: 0.5rem;
        }
        
        .modal-footer {
          padding: 1.5rem 2rem;
          border-top: 2px solid rgba(59, 130, 246, 0.3);
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          background: rgba(30, 41, 59, 0.95);
          border-radius: 0 0 16px 16px;
        }
        
        .info-box {
          padding: 12px;
          background: rgba(59, 130, 246, 0.15);
          border-radius: 10px;
          margin-bottom: 10px;
          border-left: 4px solid #3b82f6;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease;
        }
        
        .info-box:hover {
          transform: translateY(-2px);
          background: rgba(59, 130, 246, 0.2);
        }
        
        .info-box small {
          color: #94a3b8 !important;
          font-size: 0.85rem;
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .info-box p {
          color: #f1f5f9 !important;
          font-size: 1.1rem;
          margin: 0;
        }
        
        .text-muted {
          color: #cbd5e0 !important;
        }
        
        .text-primary {
          color: #60a5fa !important;
        }
        
        .text-success {
          color: #34d399 !important;
        }
        
        /* Table styles */
        .table {
          color: #f1f5f9 !important;
          background: rgba(30, 41, 59, 0.8);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .table-bordered {
          border: 2px solid rgba(59, 130, 246, 0.3);
        }
        
        .table-bordered th,
        .table-bordered td {
          border: 1px solid rgba(59, 130, 246, 0.2);
          padding: 12px;
        }
        
        .table thead th {
          border-bottom: 3px solid rgba(59, 130, 246, 0.4);
          background: rgba(59, 130, 246, 0.2);
          color: #dbeafe !important;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 0.9rem;
        }
        
        .table tbody tr:hover {
          background: rgba(59, 130, 246, 0.1);
        }
        
        .table tbody td {
          font-weight: 500;
        }
        
        /* Product Specifications Container */
        .product-specs-container {
          background: rgba(30, 41, 59, 0.8);
          border-radius: 12px;
          padding: 20px;
          border: 2px solid rgba(59, 130, 246, 0.2);
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        .specs-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        
        .spec-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(59, 130, 246, 0.15);
        }
        
        .spec-row:last-child {
          border-bottom: none;
        }
        
        .spec-label {
          font-weight: 600;
          color: #cbd5e0;
          font-size: 0.95rem;
          min-width: 180px;
        }
        
        .spec-value {
          color: #f8fafc !important;
          font-weight: 500;
          font-size: 0.95rem;
          text-align: right;
          max-width: 60%;
          word-break: break-word;
          background: rgba(59, 130, 246, 0.1);
          padding: 6px 12px;
          border-radius: 6px;
          border-left: 3px solid #3b82f6;
        }
        
        /* Glass effect */
        .glass {
          background: rgba(31, 41, 55, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(59, 130, 246, 0.15);
        }
        
        /* No products message */
        .no-products-message {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 300px;
          padding: 2rem;
        }
        
        /* Line clamp for text */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Button styles inside modal */
        .modal-footer .btn {
          padding: 10px 24px;
          font-weight: 600;
          font-size: 1rem;
          border-radius: 10px;
          transition: all 0.3s ease;
          min-width: 120px;
        }
        
        .modal-footer .btn-secondary {
          background: linear-gradient(135deg, #475569 0%, #334155 100%);
          border: none;
          color: #f1f5f9;
        }
        
        .modal-footer .btn-secondary:hover {
          background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }
        
        .modal-footer .btn-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: white;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }
        
        .modal-footer .btn-success:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }
        
        /* Responsive adjustments - FIXED for iPad Mini */
        @media (max-width: 575px) {
          /* Phones */
          .product-main-content {
            padding: 10px;
          }
          
          .back-button {
            left: 10px;
            top: 70px;
            width: 35px;
            height: 35px;
          }
          
          .currency-selector-container {
            right: 10px;
            top: 70px;
          }
          
          .currency-dropdown {
            min-width: 130px !important;
            font-size: 0.85rem !important;
          }
          
          .product-header {
            margin-top: 100px;
          }
          
          .product-card {
            margin-bottom: 1rem;
          }
        }
        
        @media (min-width: 576px) and (max-width: 767px) {
          /* Small tablets (including iPad Mini portrait) */
          .product-main-content {
            padding: 15px;
          }
          
          .back-button {
            left: 15px;
            top: 80px;
          }
          
          .currency-selector-container {
            right: 15px;
            top: 80px;
          }
          
          .product-header {
            margin-top: 100px;
          }
          
          /* Ensure 2 products per row on iPad Mini */
          .products-grid .row {
            --bs-gutter-x: 1rem;
          }
          
          .product-card {
            min-height: 480px !important;
          }
          
          .product-image-container {
            height: 180px;
          }
        }
        
        @media (min-width: 768px) and (max-width: 991px) {
          /* Tablets (iPad Mini landscape, larger tablets) */
          .product-main-content {
            padding: 20px;
          }
          
          .back-button {
            left: 20px;
            top: 90px;
          }
          
          .currency-selector-container {
            right: 20px;
            top: 90px;
          }
          
          .product-header {
            margin-top: 110px;
          }
          
          /* For iPad Mini landscape, show 3 products per row */
          .products-grid .row {
            --bs-gutter-x: 1.5rem;
          }
          
          /* Ensure proper spacing for 3 columns */
          .products-grid .col-md-6 {
            width: 50%; /* 2 columns for some cases */
          }
          
          .products-grid .col-md-4 {
            width: 33.333%; /* 3 columns */
          }
          
          .product-card {
            min-height: 520px !important;
          }
          
          .product-image-container {
            height: 200px;
          }
        }
        
        @media (min-width: 992px) {
          /* Desktop */
          .products-grid .row {
            --bs-gutter-x: 1.5rem;
          }
          
          /* Ensure 4 products per row on desktop */
          .products-grid .col-lg-3 {
            width: 25%;
          }
          
          .product-card {
            min-height: 500px !important;
          }
          
          .product-image-container {
            height: 200px;
          }
        }
        
        /* Fix for iPad Mini specific issues */
        @media (width: 768px) and (height: 1024px) {
          /* iPad Mini portrait */
          .product-main-content {
            padding: 15px;
          }
          
          .product-header {
            margin-top: 100px;
            margin-bottom: 1.5rem;
          }
          
          .products-grid .row {
            --bs-gutter-x: 1rem;
          }
          
          .product-card {
            min-height: 460px !important;
          }
          
          .product-image-container {
            height: 160px;
          }
        }
        
        @media (width: 1024px) and (height: 768px) {
          /* iPad Mini landscape */
          .product-header {
            margin-top: 100px;
            margin-bottom: 1.5rem;
          }
          
          .products-grid .row {
            --bs-gutter-x: 1.5rem;
          }
          
          .product-card {
            min-height: 480px !important;
          }
          
          .product-image-container {
            height: 180px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductPage;