// components/CheckoutModal.jsx
import React, { useState, useEffect, useRef } from "react";
import ThankYouPopup from "../components/ThankYouPopup";
import { submitQuote } from "../firebase";
import {
  varietyGrades,
  gradePrices,
  getPackingOptions,
  getQuantityOptions,
  transportData,
  getPackingUnit,
  getAvailableGrades,
  getTransportPrice,
  getUnitType
} from "../data/ProductData";
import { ShoppingBag, Package, Trash2, Plus, Minus, X, Check } from 'lucide-react';
import "../styles/form.css";

const CheckoutModal = ({ isOpen, onClose, products, profile, onOrderSubmitted }) => {
  // State declarations
  const [cifRequired, setCifRequired] = useState("No");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState("0.00");
  const [currency, setCurrency] = useState("INR");
  const [brandingRequired, setBrandingRequired] = useState("No");
  const [shippingCost, setShippingCost] = useState("0.00");
  const [insuranceCost, setInsuranceCost] = useState("0.00");
  const [taxes, setTaxes] = useState("0.00");
  const [brandingCost, setBrandingCost] = useState("0.00");
  const [transportCost, setTransportCost] = useState("0.00");
  const [submitError, setSubmitError] = useState("");

  // State for cart products and configurations
  const [cartProducts, setCartProducts] = useState([]);
  const [cartProductConfigs, setCartProductConfigs] = useState({});

  // Order quantity state
  const [productOrderQuantities, setProductOrderQuantities] = useState({});

  // ============================================
  // Port of Loading and Port of Destination
  // ============================================
  const [portOfLoading, setPortOfLoading] = useState({
    country: "",
    state: "",
    portName: ""
  });
  
  const [portOfDestination, setPortOfDestination] = useState({
    country: "",
    state: "",
    portName: ""
  });
  
  const [transportPrice, setTransportPrice] = useState("0-0");

  // Profile fields
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  // Auto-fill tracking
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [autoFillAttempted, setAutoFillAttempted] = useState(false);

  const modalRef = useRef(null);
  const formContainerRef = useRef(null);
  const estimateContainerRef = useRef(null);

  // Constants
  const countryOptions = [
    { value: "+91", flag: "🇮🇳", name: "India", length: 10, currency: "INR" },
    { value: "+968", flag: "🇴🇲", name: "Oman", length: 8, currency: "OMR" },
    { value: "+44", flag: "🇬🇧", name: "United Kingdom", length: 10, currency: "GBP" },
    { value: "+1", flag: "🇺🇸", name: "USA", length: 10, currency: "USD" },
    { value: "+971", flag: "🇦🇪", name: "UAE", length: 9, currency: "AED" },
    { value: "+61", flag: "🇦🇺", name: "Australia", length: 9, currency: "AUD" },
    { value: "+98", flag: "🇮🇷", name: "Iran", length: 10, currency: "IRR" },
    { value: "+66", flag: "🇹🇭", name: "Thailand", length: 9, currency: "THB" },
    { value: "+90", flag: "🇹🇷", name: "Turkey", length: 10, currency: "TRY" },
  ];

  const countryNames = [
    { name: "India", code: "IN" },
    { name: "Oman", code: "OM" },
    { name: "United Kingdom", code: "GB" },
    { name: "United States", code: "US" },
    { name: "UAE", code: "AE" },
    { name: "Australia", code: "AU" },
    { name: "Canada", code: "CA" },
    { name: "Germany", code: "DE" },
    { name: "France", code: "FR" },
    { name: "Singapore", code: "SG" },
    { name: "Japan", code: "JP" },
    { name: "Turkey", code: "TR" },
    { name: "China", code: "CN" }
  ];

  const currencyOptions = [
    { value: "INR", symbol: "₹", name: "Indian Rupee" },
    { value: "USD", symbol: "$", name: "US Dollar" },
    { value: "EUR", symbol: "€", name: "Euro" },
    { value: "GBP", symbol: "£", name: "British Pound" },
    { value: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { value: "SAR", symbol: "﷼", name: "Saudi Riyal" },
    { value: "THB", symbol: "฿", name: "Thai Baht" },
    { value: "TRY", symbol: "₺", name: "Turkish Lira" },
    { value: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { value: "AUD", symbol: "A$", name: "Australian Dollar" },
    { value: "JPY", symbol: "¥", name: "Japanese Yen" },
    { value: "CNY", symbol: "¥", name: "Chinese Yuan" },
    { value: "OMR", symbol: "﷼", name: "Omani Rial" }
  ];

  // ============================================
  // ANALYZE PRODUCT DATA - FIXED: Better currency detection
  // ============================================
  const analyzeProductData = (product) => {
    if (!product) return {};
    console.log("📦 Raw Product Data in Checkout:", product);

    const firebaseData = product.firebaseProductData || product;

    let priceValue = 0;
    let currencyDetected = "INR"; // Default to INR
    let priceDisplay = "";
    let minPrice = 0;
    let maxPrice = 0;
    let isRange = false;

    // Check for USD price fields first
    if (firebaseData.price_usd_per_carton !== undefined) {
      priceValue = firebaseData.price_usd_per_carton;
      currencyDetected = "USD";
      priceDisplay = `$${priceValue} per carton`;
    } else if (firebaseData.fob_price_usd !== undefined) {
      priceValue = firebaseData.fob_price_usd;
      currencyDetected = "USD";
      priceDisplay = `$${priceValue} per carton`;
    } else if (firebaseData["Ex-Mill_usd"] !== undefined) {
      priceValue = firebaseData["Ex-Mill_usd"];
      currencyDetected = "USD";
      priceDisplay = `$${priceValue} EX-MILL per carton`;
    }
    // Check for INR price fields
    else if (firebaseData.price && typeof firebaseData.price === 'object') {
      if (firebaseData.price.min !== undefined && firebaseData.price.max !== undefined) {
        minPrice = firebaseData.price.min;
        maxPrice = firebaseData.price.max;
        priceValue = (minPrice + maxPrice) / 2;
        currencyDetected = "INR";
        priceDisplay = `₹${minPrice} - ₹${maxPrice} per kg`;
        isRange = true;
      }
    } else if (typeof firebaseData.price === 'string') {
      if (firebaseData.price.includes('$')) {
        currencyDetected = "USD";
        priceValue = parseFloat(firebaseData.price.replace(/[^\d.-]/g, '')) || 0;
      } else if (firebaseData.price.includes('₹') || firebaseData.price.includes('Rs') || firebaseData.price.includes('INR')) {
        currencyDetected = "INR";
        priceValue = parseFloat(firebaseData.price.replace(/[^\d.-]/g, '')) || 0;
      } else {
        // Default to INR if no currency symbol
        currencyDetected = "INR";
        priceValue = parseFloat(firebaseData.price) || 0;
      }
      priceDisplay = firebaseData.price;
    } else if (typeof firebaseData.price === 'number') {
      // Default to INR for numeric prices
      priceValue = firebaseData.price;
      priceDisplay = `₹${priceValue}`;
      currencyDetected = "INR";
    }

    let origin = firebaseData.origin ||
      firebaseData.Origin ||
      firebaseData.country_of_origin ||
      "India";

    let grades = [];
    let hasGradesField = false;

    if (firebaseData.grades && Array.isArray(firebaseData.grades)) {
      hasGradesField = true;
    }

    let packagingInfo = "";
    if (firebaseData.packaging) {
      if (typeof firebaseData.packaging === 'object') {
        if (firebaseData.packaging.type) {
          packagingInfo = firebaseData.packaging.type;
        } else if (firebaseData.packaging.units_per_carton) {
          packagingInfo = `${firebaseData.packaging.units_per_carton} units per carton`;
          if (firebaseData.packaging.unit_weight_g) {
            packagingInfo += ` (${firebaseData.packaging.unit_weight_g}g each)`;
          }
        }
      } else if (typeof firebaseData.packaging === 'string') {
        packagingInfo = firebaseData.packaging;
      }
    } else if (firebaseData.pack_type) {
      packagingInfo = firebaseData.pack_type;
    }

    const productType = getProductType(firebaseData);

    let productImage = firebaseData.image ||
      firebaseData.imageUrl ||
      firebaseData.productImage ||
      firebaseData.localImage ||
      product.image ||
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&auto=format&fit=crop&q=60";

    return {
      priceValue,
      minPrice,
      maxPrice,
      isRange,
      currency: currencyDetected,
      priceDisplay,
      origin,
      grades,
      hasGrades: hasGradesField,
      packagingInfo,
      productType,
      rawPrice: firebaseData.price,
      productImage,
      firebaseData: firebaseData
    };
  };

  const getProductType = (product) => {
    if (!product) return 'default';

    if (product.category) {
      return product.category.toLowerCase();
    }

    const productName = product.name?.toLowerCase() || '';
    const companyName = product.companyName?.toLowerCase() || '';

    if (companyName.includes('siea')) {
      return 'rice';
    }

    if (companyName.includes('heritage')) {
      if (productName.includes('rice')) return 'rice';
      if (productName.includes('dal') || productName.includes('lentil')) return 'pulses';
      if (productName.includes('spice')) return 'spices';
      if (productName.includes('tea')) return 'tea';
      return 'default';
    }

    if (companyName.includes('nut walker')) {
      return 'dryfruits';
    }

    if (companyName.includes('akil drinks')) {
      return 'beverages';
    }

    if (productName.includes('oil') || productName.includes('sunflower') || productName.includes('olive')) {
      return 'oil';
    }
    if (productName.includes('dal') || productName.includes('lentil') || productName.includes('pulse')) {
      return 'pulses';
    }
    if (productName.includes('spice') || productName.includes('turmeric') || productName.includes('chilli')) {
      return 'spices';
    }
    if (productName.includes('tea') || productName.includes('green tea') || productName.includes('black tea')) {
      return 'tea';
    }
    if (productName.includes('almond') || productName.includes('cashew') || productName.includes('dry fruit')) {
      return 'dryfruits';
    }
    if (productName.includes('juice') || productName.includes('drink') || productName.includes('beverage')) {
      return 'beverages';
    }

    return 'default';
  };

  const getQuantityOptionsForProduct = (product) => {
    const analysis = analyzeProductData(product);
    const productName = product?.name?.toLowerCase() || '';
    const productType = analysis.productType;
    const firebaseData = analysis.firebaseData || product;

    const isCartonBased = firebaseData?.price_usd_per_carton ||
      firebaseData?.fob_price_usd ||
      firebaseData?.["Ex-Mill_usd"] ||
      (firebaseData?.packaging && firebaseData.packaging.units_per_carton);

    if (isCartonBased) {
      const unitsPerCarton = firebaseData?.packaging?.units_per_carton || 48;
      return [
        { value: "1", label: `1 Carton (${unitsPerCarton} units)`, multiplier: 1, unit: "cartons", actualQuantity: 1, actualUnit: "cartons" },
        { value: "5", label: `5 Cartons (${unitsPerCarton * 5} units)`, multiplier: 5, unit: "cartons", actualQuantity: 5, actualUnit: "cartons" },
        { value: "10", label: `10 Cartons (${unitsPerCarton * 10} units)`, multiplier: 10, unit: "cartons", actualQuantity: 10, actualUnit: "cartons" },
        { value: "20", label: `20 Cartons (${unitsPerCarton * 20} units)`, multiplier: 20, unit: "cartons", actualQuantity: 20, actualUnit: "cartons" },
        { value: "custom", label: "Custom Quantity", multiplier: 1, unit: "cartons", actualQuantity: 0, actualUnit: "cartons" }
      ];
    }

    if (productType === 'rice') {
      return [
        { value: "1", label: "1 kg", multiplier: 1, unit: "kg", actualQuantity: 1, actualUnit: "kg" },
        { value: "5", label: "5 kg", multiplier: 5, unit: "kg", actualQuantity: 5, actualUnit: "kg" },
        { value: "10", label: "10 kg", multiplier: 10, unit: "kg", actualQuantity: 10, actualUnit: "kg" },
        { value: "25", label: "25 kg", multiplier: 25, unit: "kg", actualQuantity: 25, actualUnit: "kg" },
        { value: "50", label: "50 kg", multiplier: 50, unit: "kg", actualQuantity: 50, actualUnit: "kg" },
        { value: "100", label: "100 kg (1 Quintal)", multiplier: 100, unit: "kg", actualQuantity: 100, actualUnit: "kg" },
        { value: "1000", label: "1000 kg (1 Ton)", multiplier: 1000, unit: "kg", actualQuantity: 1000, actualUnit: "kg" },
        { value: "custom", label: "Custom Quantity", multiplier: 1, unit: "kg", actualQuantity: 0, actualUnit: "kg" }
      ];
    }

    let options = getQuantityOptions(productType, productName);
    return options;
  };

  const getPackingOptionsForProduct = (product) => {
    const analysis = analyzeProductData(product);
    const productType = analysis.productType;
    const productName = product?.name?.toLowerCase() || '';
    const firebaseData = analysis.firebaseData || product;

    if (productType === 'rice') {
      return getPackingOptions('rice', productName);
    }

    let firebasePacking = "";

    if (firebaseData?.pack_type) {
      firebasePacking = firebaseData.pack_type;
    } else if (firebaseData?.packaging) {
      if (typeof firebaseData.packaging === 'string') {
        firebasePacking = firebaseData.packaging;
      } else if (typeof firebaseData.packaging === 'object' && firebaseData.packaging.type) {
        firebasePacking = firebaseData.packaging.type;
      }
    }

    if (firebasePacking) {
      return [
        { value: firebasePacking, price: "0" }
      ];
    }

    return getPackingOptions(productType, productName);
  };

  // ============================================
  // FIXED: Get price per unit - Respects product currency
  // ============================================
  const getPricePerUnit = (productId) => {
    const config = cartProductConfigs[productId] || {};
    const product = cartProducts.find(p => p.id === productId);
    if (!product) return 0;

    if (product.selectedGradePrice) {
      return parseFloat(product.selectedGradePrice);
    }

    if (product.price && typeof product.price === 'object') {
      if (product.price.value !== undefined) {
        return parseFloat(product.price.value);
      }
      if (product.price.min !== undefined && product.price.max !== undefined) {
        return (parseFloat(product.price.min) + parseFloat(product.price.max)) / 2;
      }
    }

    // Check USD fields first if product currency is USD
    if (product.productCurrency === 'USD') {
      if (product.price_usd_per_carton) {
        return parseFloat(product.price_usd_per_carton);
      }
      if (product.fob_price_usd) {
        return parseFloat(product.fob_price_usd);
      }
      if (product["Ex-Mill_usd"]) {
        return parseFloat(product["Ex-Mill_usd"]);
      }
    }

    const analysis = analyzeProductData(product);
    return analysis.priceValue;
  };

  const getQuantityUnit = (product) => {
    const analysis = analyzeProductData(product);
    const firebaseData = analysis.firebaseData || product;

    const isCartonBased = firebaseData?.price_usd_per_carton ||
      firebaseData?.fob_price_usd ||
      firebaseData?.["Ex-Mill_usd"];

    if (isCartonBased) {
      return "cartons";
    }

    const productType = analysis.productType;
    if (productType === 'rice') {
      return 'kg';
    }

    switch (productType) {
      case 'rice': return 'kg';
      case 'oil': return 'liters';
      case 'beverages': return 'bottles';
      case 'dryfruits': return 'kg';
      case 'spices': return 'kg';
      case 'tea': return 'kg';
      case 'pulses': return 'kg';
      default: return 'units';
    }
  };

  // ============================================
  // getSelectedQuantityDisplay - Shows only the selected quantity
  // ============================================
  const getSelectedQuantityDisplay = (cartItemId) => {
    const product = cartProducts.find(p => (p.cartItemId || p.id) === cartItemId);
    if (!product) return "Not selected";
    
    const config = cartProductConfigs[product.id] || {};
    
    if (product.selectedQuantity) {
      if (product.selectedQuantity === "custom") {
        return `${config.customQuantity || product.customQuantity || 'Custom'} ${product.quantityUnit || 'kg'}`;
      } else {
        return `${product.selectedQuantity} ${product.quantityUnit || 'kg'}`;
      }
    }
    
    if (config.quantity === "custom") {
      return `${config.customQuantity || 0} ${getQuantityUnit(product)}`;
    } else {
      return `${config.quantity} ${getQuantityUnit(product)}`;
    }
  };

  // ============================================
  // Get product currency symbol based on product's original currency
  // ============================================
  const getProductCurrencySymbol = (product) => {
    const analysis = analyzeProductData(product);
    if (analysis.currency === 'USD') {
      return '$';
    }
    return '₹';
  };

  useEffect(() => {
    if (isOpen && products && products.length > 0) {
      console.log("🛒 Products received in CheckoutModal:", products);
      
      const processedProducts = products.map(product => {
        const analysis = analyzeProductData(product);
        
        // Create base product object
        const processedProduct = {
          ...product,
          id: product.id || product.productId,
          cartItemId: product.cartItemId || `${product.id}_${product.brandId || 'nobrand'}_${product.selectedGrade || 'nograde'}_${Date.now()}`,
          name: product.name || analysis.firebaseData?.name || `Product ${product.id}`,
          price: analysis.priceValue,
          minPrice: analysis.minPrice,
          maxPrice: analysis.maxPrice,
          isRange: analysis.isRange,
          quantity: product.quantity || 1,
          image: analysis.productImage,
          companyName: product.companyName || analysis.firebaseData?.companyName || 'Unknown Company',
          brandName: product.brandName || analysis.firebaseData?.brandName || 'General',
          brandId: product.brandId || null,
          companyId: product.companyId || null,
          unit: analysis.productType === 'rice' ? 'kg' : 'unit',
          category: product.category || analysis.productType,
          origin: analysis.origin,
          packagingInfo: analysis.packagingInfo,
          hasGrades: analysis.hasGrades,
          productCurrency: analysis.currency, // This will be either 'INR' or 'USD'
          productType: analysis.productType,
          firebaseData: analysis.firebaseData || product.firebaseProductData || product,
          
          selectedGrade: product.selectedGrade || product.selectedConfig?.grade || null,
          selectedGradePrice: product.selectedGradePrice || product.selectedConfig?.gradePrice || null,
          selectedGradeDisplay: product.selectedGradeDisplay || product.selectedConfig?.gradeDisplay || product.selectedGrade || null,
          selectedPacking: product.selectedPacking || product.selectedConfig?.packing || null,
          selectedQuantity: product.selectedQuantity || product.selectedConfig?.quantity || null,
          quantityUnit: product.quantityUnit || product.selectedConfig?.quantityUnit || 'kg',
          isRice: product.isRice || product.selectedConfig?.isRice || false,
          
          hasGradesArray: !!(product.grades || analysis.grades)
        };
        
        // Only add USD fields if they exist in the original product
        if (product.price_usd_per_carton !== undefined || analysis.firebaseData?.price_usd_per_carton !== undefined) {
          processedProduct.price_usd_per_carton = product.price_usd_per_carton || analysis.firebaseData?.price_usd_per_carton;
        }
        
        if (product.fob_price_usd !== undefined || analysis.firebaseData?.fob_price_usd !== undefined) {
          processedProduct.fob_price_usd = product.fob_price_usd || analysis.firebaseData?.fob_price_usd;
        }
        
        if (product["Ex-Mill_usd"] !== undefined || analysis.firebaseData?.["Ex-Mill_usd"] !== undefined) {
          processedProduct["Ex-Mill_usd"] = product["Ex-Mill_usd"] || analysis.firebaseData?.["Ex-Mill_usd"];
        }
        
        return processedProduct;
      });
      
      console.log("✅ Processed cart products with selected config:", processedProducts.map(p => ({
        name: p.name,
        brandName: p.brandName,
        productCurrency: p.productCurrency,
        selectedGrade: p.selectedGrade,
        selectedGradeDisplay: p.selectedGradeDisplay,
        selectedGradePrice: p.selectedGradePrice,
        selectedPacking: p.selectedPacking,
        selectedQuantity: p.selectedQuantity,
        quantityUnit: p.quantityUnit,
        price_usd_per_carton: p.price_usd_per_carton,
        fob_price_usd: p.fob_price_usd
      })));
      
      setCartProducts(processedProducts);

      const initialConfigs = {};
      
      processedProducts.forEach((prod) => {
        const analysis = analyzeProductData(prod);
        const quantityOptions = getQuantityOptionsForProduct(prod);
        
        initialConfigs[prod.id] = {
          grade: prod.selectedGrade || null,
          gradePrice: prod.selectedGradePrice || null,
          gradeDisplay: prod.selectedGradeDisplay || prod.selectedGrade || null,
          packing: prod.selectedPacking || null,
          quantity: prod.selectedQuantity || null,
          customQuantity: "",
          quantityOptions: quantityOptions,
          unit: getQuantityUnit(prod),
          productPriceDisplay: analysis.priceDisplay,
          minPrice: analysis.minPrice,
          maxPrice: analysis.maxPrice,
          displayGrade: prod.selectedGradeDisplay || prod.selectedGrade || null,
          displayGradePrice: prod.selectedGradePrice || null,
          displayPacking: prod.selectedPacking || null,
          displayQuantity: prod.selectedQuantity || null,
          displayQuantityUnit: prod.quantityUnit || 'kg'
        };
      });
      
      setCartProductConfigs(initialConfigs);

      const initialOrderQuantities = {};
      processedProducts.forEach((prod) => {
        initialOrderQuantities[prod.cartItemId || prod.id] = 1;
      });
      setProductOrderQuantities(initialOrderQuantities);
    }
  }, [isOpen, products]);

  const updateCartProductConfig = (productId, key, value) => {
    setCartProductConfigs(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [key]: value
      }
    }));
  };

  const handleIncreaseOrderQuantity = (cartItemId) => {
    setProductOrderQuantities(prev => ({
      ...prev,
      [cartItemId]: (prev[cartItemId] || 1) + 1
    }));
  };

  const handleDecreaseOrderQuantity = (cartItemId) => {
    setProductOrderQuantities(prev => ({
      ...prev,
      [cartItemId]: Math.max(1, (prev[cartItemId] || 1) - 1)
    }));
  };

  // ============================================
  // Currency conversion helper function
  // ============================================
  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return amount;
    
    const exchangeRates = {
      INR: 1,
      USD: 0.012,
      EUR: 0.011,
      GBP: 0.0095,
      AED: 0.044,
      SAR: 0.045,
      THB: 0.43,
      TRY: 0.37,
      CAD: 0.016,
      AUD: 0.018,
      JPY: 1.80,
      CNY: 0.087,
      OMR: 0.0046
    };
    
    let amountInINR = amount;
    if (fromCurrency !== 'INR') {
      amountInINR = amount / exchangeRates[fromCurrency];
    }
    
    if (toCurrency === 'INR') return amountInINR;
    return amountInINR * exchangeRates[toCurrency];
  };

  const calculateCartTotal = () => {
    let total = 0;

    cartProducts.forEach(cartProduct => {
      const config = cartProductConfigs[cartProduct.id] || {};
      const orderQuantity = productOrderQuantities[cartProduct.cartItemId || cartProduct.id] || 1;
      
      let pricePerUnit = getPricePerUnit(cartProduct.id);
      
      const baseCurrency = cartProduct.productCurrency || 'INR';
      if (currency !== baseCurrency) {
        pricePerUnit = convertCurrency(pricePerUnit, baseCurrency, currency);
      }
      
      let packageQuantity = 1;
      if (cartProduct.selectedQuantity) {
        if (cartProduct.selectedQuantity === "custom") {
          packageQuantity = parseFloat(config.customQuantity) || 1;
        } else {
          packageQuantity = parseFloat(cartProduct.selectedQuantity) || 1;
        }
      } else if (config.quantity) {
        if (config.quantity === "custom") {
          packageQuantity = parseFloat(config.customQuantity) || 1;
        } else {
          packageQuantity = parseFloat(config.quantity) || 1;
        }
      }

      let productSubtotal = pricePerUnit * packageQuantity * orderQuantity;
      total += productSubtotal;
    });

    let brandingCostValue = 0;
    if (brandingRequired === "Yes") {
      if (currency === 'INR') {
        brandingCostValue = 35 * cartProducts.length;
      } else {
        brandingCostValue = convertCurrency(35 * cartProducts.length, 'INR', currency);
      }
      total += brandingCostValue;
    }
    setBrandingCost(brandingCostValue.toFixed(2));

    const transportCostValue = calculateTransportCost();
    total += transportCostValue;
    setTransportCost(transportCostValue.toFixed(2));

    if (cifRequired === "Yes") {
      const shippingCostValue = calculateShippingCost(total);
      const insuranceCostValue = calculateInsuranceCost(total);
      const taxesValue = calculateTaxes(total);

      total += shippingCostValue + insuranceCostValue + taxesValue;

      setShippingCost(shippingCostValue.toFixed(2));
      setInsuranceCost(insuranceCostValue.toFixed(2));
      setTaxes(taxesValue.toFixed(2));
    } else {
      setShippingCost("0.00");
      setInsuranceCost("0.00");
      setTaxes("0.00");
    }

    setTotalPrice(total.toFixed(2));
  };

  const calculateTransportCost = () => {
    if (!transportPrice || transportPrice === "0-0") {
      return 0;
    }

    const totalQuantity = cartProducts.reduce((sum, prod) => {
      const config = cartProductConfigs[prod.id] || {};
      const orderQuantity = productOrderQuantities[prod.cartItemId || prod.id] || 1;
      
      let packageQuantity = 1;
      if (prod.selectedQuantity) {
        packageQuantity = parseFloat(prod.selectedQuantity) || 1;
      } else if (config.quantity) {
        packageQuantity = parseFloat(config.quantity) || 1;
      }
      
      return sum + (packageQuantity * orderQuantity);
    }, 0);

    if (totalQuantity <= 0) return 0;

    const [minPrice, maxPrice] = transportPrice.split('-').map(price => parseFloat(price.trim()));
    if (isNaN(minPrice) || isNaN(maxPrice)) return 0;

    const averagePrice = (minPrice + maxPrice) / 2;
    
    if (currency === 'INR') {
      return totalQuantity * averagePrice;
    } else {
      return totalQuantity * convertCurrency(averagePrice, 'INR', currency);
    }
  };

  const calculateShippingCost = (subtotal) => {
    if (cifRequired !== "Yes") return 0;
    return Math.max(subtotal * 0.02, subtotal * 0.01);
  };

  const calculateInsuranceCost = (subtotal) => {
    if (cifRequired !== "Yes") return 0;
    return subtotal * 0.005;
  };

  const calculateTaxes = (subtotal) => {
    if (cifRequired !== "Yes") return 0;
    return subtotal * 0.03;
  };

  const getDisplayPrices = () => {
    const selectedCurrencySymbol = getCurrencySymbol();
    
    let subtotal = 0;
    cartProducts.forEach(prod => {
      const config = cartProductConfigs[prod.id] || {};
      const orderQuantity = productOrderQuantities[prod.cartItemId || prod.id] || 1;
      
      let pricePerUnit = getPricePerUnit(prod.id);
      
      const baseCurrency = prod.productCurrency || 'INR';
      if (currency !== baseCurrency) {
        pricePerUnit = convertCurrency(pricePerUnit, baseCurrency, currency);
      }
      
      let packageQuantity = 1;
      if (prod.selectedQuantity) {
        packageQuantity = parseFloat(prod.selectedQuantity) || 1;
      } else if (config.quantity) {
        packageQuantity = parseFloat(config.quantity) || 1;
      }
      
      subtotal += pricePerUnit * packageQuantity * orderQuantity;
    });

    const formattedSubtotal = `${selectedCurrencySymbol}${formatNumber(subtotal)}`;
    
    let brandingCostFormatted = "Not Required";
    if (brandingRequired === "Yes") {
      let brandingValue = parseFloat(brandingCost);
      brandingCostFormatted = `${selectedCurrencySymbol}${formatNumber(brandingValue)}`;
    }
    
    let transportCostFormatted = "Not Required";
    if (transportPrice !== "0-0") {
      let transportValue = parseFloat(transportCost);
      transportCostFormatted = `${selectedCurrencySymbol}${formatNumber(transportValue)}`;
    }
    
    let shippingCostFormatted = "Not Required";
    let insuranceCostFormatted = "Not Required";
    let taxesFormatted = "Not Required";
    
    if (cifRequired === "Yes") {
      shippingCostFormatted = `${selectedCurrencySymbol}${formatNumber(shippingCost)}`;
      insuranceCostFormatted = `${selectedCurrencySymbol}${formatNumber(insuranceCost)}`;
      taxesFormatted = `${selectedCurrencySymbol}${formatNumber(taxes)}`;
    }
    
    const finalTotalFormatted = `${selectedCurrencySymbol}${formatNumber(totalPrice)}`;

    return {
      originalPrice: formattedSubtotal,
      itemCount: `${cartProducts.length} products`,
      brandingCost: brandingCostFormatted,
      transportCost: transportCostFormatted,
      shippingCost: shippingCostFormatted,
      insuranceCost: insuranceCostFormatted,
      taxes: taxesFormatted,
      finalTotalPrice: finalTotalFormatted
    };
  };

  const getCurrencySymbol = () => {
    const selectedCurrency = currencyOptions.find(curr => curr.value === currency);
    return selectedCurrency ? selectedCurrency.symbol : "₹";
  };

  const getCurrentCountry = () => countryOptions.find((opt) => opt.value === countryCode);

  const formatNumber = (num) => {
    const number = parseFloat(num);
    if (isNaN(number)) return "0.00";
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const validatePhoneNumber = (number, code) => {
    const selectedCountry = countryOptions.find((opt) => opt.value === code);
    const expectedLength = selectedCountry?.length || 10;

    if (!number) {
      setPhoneError("Phone number is required");
      return false;
    } else if (number.length !== expectedLength) {
      setPhoneError(`Phone number must be ${expectedLength} digits`);
      return false;
    } else if (!/^\d+$/.test(number)) {
      setPhoneError("Phone number must contain only digits");
      return false;
    } else {
      setPhoneError("");
      return true;
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Invalid email format");
      return false;
    } else {
      setEmailError("");
      return true;
    }
  };

  // Event handlers
  const handleCountryChange = (e) => {
    const newCode = e.target.value;
    setCountryCode(newCode);

    const selectedCountry = countryOptions.find(opt => opt.value === newCode);
    if (selectedCountry) {
      setCountry(selectedCountry.name);
      if (selectedCountry.currency) {
        setCurrency(selectedCountry.currency);
      }
    }

    validatePhoneNumber(phoneNumber, newCode);
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setPhoneNumber(value);
    validatePhoneNumber(value, countryCode);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const handleFullNameChange = (e) => {
    setFullName(e.target.value);
  };

  const handleCountryNameChange = (e) => {
    setCountry(e.target.value);
  };

  const handleStateChangeInput = (e) => {
    setState(e.target.value);
  };

  const handleCityChange = (e) => {
    setCity(e.target.value);
  };

  const handlePincodeChange = (e) => {
    setPincode(e.target.value);
  };

  const handleCifChange = (e) => {
    setCifRequired(e.target.value);
  };

  const handleCurrencyChange = (e) => {
    setCurrency(e.target.value);
  };

  const handleBrandingChange = (e) => {
    setBrandingRequired(e.target.value);
  };

  const handlePortOfLoadingChange = (field, value) => {
    setPortOfLoading(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePortOfDestinationChange = (field, value) => {
    setPortOfDestination(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCartProductQuantityChange = (productId, value) => {
    setCartProductConfigs(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: value,
        customQuantity: value === "custom" ? "" : prev[productId]?.customQuantity
      }
    }));
  };

  const handleCustomQuantityChange = (productId, value) => {
    setCartProductConfigs(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        customQuantity: value
      }
    }));
  };

  const handleRemoveCartProduct = (cartItemId) => {
    setCartProducts(prev => prev.filter(p => (p.cartItemId || p.id) !== cartItemId));
    setCartProductConfigs(prev => {
      const newConfigs = { ...prev };
      const itemToRemove = cartProducts.find(p => (p.cartItemId || p.id) === cartItemId);
      if (itemToRemove) {
        delete newConfigs[itemToRemove.id];
      }
      return newConfigs;
    });
    setProductOrderQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[cartItemId];
      return newQuantities;
    });
  };

  useEffect(() => {
    if (isOpen) {
      console.log("🔍 Checkout Modal Opened - Profile:", profile);
      console.log("🔍 Resetting auto-fill state for new checkout");
      
      setHasAutoFilled(false);
      setAutoFillAttempted(false);
      
      setPhoneError("");
      setEmailError("");
      
      if (profile) {
        console.log("🚀 Triggering auto-fill from profile on modal open...");
        setTimeout(() => {
          handleAutoFillFromProfile();
        }, 100);
      } else {
        console.log("⚠️ No profile data available for auto-fill");
      }
    }
  }, [isOpen, profile]);

  const handleAutoFillFromProfile = () => {
    if (!profile) {
      console.log("❌ No profile data available");
      return;
    }

    console.log("📋 Profile data for auto-fill:", profile);
    console.log("📞 Profile phone fields:", {
      phone: profile.phone,
      phoneNumber: profile.phoneNumber,
      mobile: profile.mobile,
      contact: profile.contact,
      tel: profile.tel,
      telephone: profile.telephone
    });

    const newFullName = profile.name || profile.displayName || profile.fullName || "Gundu Basu Industries";
    const newEmail = profile.email || "basu@gmail.com";
    const newCountry = profile.country || "India";
    const newState = profile.state || "Andhra Pradesh";
    const newCity = profile.city || "Hyderabad";
    const newPincode = profile.pincode || "532234";

    console.log("📝 Setting name:", newFullName);
    console.log("📝 Setting email:", newEmail);
    console.log("📝 Setting country:", newCountry);
    console.log("📝 Setting state:", newState);
    console.log("📝 Setting city:", newCity);
    console.log("📝 Setting pincode:", newPincode);

    setFullName(newFullName);
    setEmail(newEmail);
    setCountry(newCountry);
    setState(newState);
    setCity(newCity);
    setPincode(newPincode);

    const phoneFromProfile = profile.phone || 
                            profile.phoneNumber || 
                            profile.mobile || 
                            profile.contact || 
                            profile.tel || 
                            profile.telephone;
    
    if (phoneFromProfile) {
      const phoneStr = phoneFromProfile.toString().trim();
      console.log("📞 Original phone from profile:", phoneStr);
      
      let foundCountryCode = "+91";
      let phoneWithoutCode = phoneStr;
      let detectedCountry = "India";
      let detectedCurrency = "INR";
      
      if (phoneStr.startsWith('+91')) {
        foundCountryCode = '+91';
        phoneWithoutCode = phoneStr.replace('+91', '');
        detectedCountry = 'India';
        detectedCurrency = 'INR';
      }
      else if (phoneStr.startsWith('91') && phoneStr.length > 10) {
        foundCountryCode = '+91';
        phoneWithoutCode = phoneStr.substring(2);
        detectedCountry = 'India';
        detectedCurrency = 'INR';
      }
      else if (phoneStr.startsWith('0')) {
        foundCountryCode = '+91';
        phoneWithoutCode = phoneStr.substring(1);
        detectedCountry = 'India';
        detectedCurrency = 'INR';
      }
      else if (phoneStr.startsWith('+968')) {
        foundCountryCode = '+968';
        phoneWithoutCode = phoneStr.replace('+968', '');
        detectedCountry = 'Oman';
        detectedCurrency = 'OMR';
      }
      else if (phoneStr.startsWith('968') && phoneStr.length > 10) {
        foundCountryCode = '+968';
        phoneWithoutCode = phoneStr.substring(3);
        detectedCountry = 'Oman';
        detectedCurrency = 'OMR';
      }
      else if (phoneStr.startsWith('+44')) {
        foundCountryCode = '+44';
        phoneWithoutCode = phoneStr.replace('+44', '');
        detectedCountry = 'United Kingdom';
        detectedCurrency = 'GBP';
      }
      else if (phoneStr.startsWith('44') && phoneStr.length > 10) {
        foundCountryCode = '+44';
        phoneWithoutCode = phoneStr.substring(2);
        detectedCountry = 'United Kingdom';
        detectedCurrency = 'GBP';
      }
      else if (phoneStr.startsWith('+1')) {
        foundCountryCode = '+1';
        phoneWithoutCode = phoneStr.replace('+1', '');
        detectedCountry = 'United States';
        detectedCurrency = 'USD';
      }
      else if (phoneStr.startsWith('1') && phoneStr.length > 10) {
        foundCountryCode = '+1';
        phoneWithoutCode = phoneStr.substring(1);
        detectedCountry = 'United States';
        detectedCurrency = 'USD';
      }
      else if (phoneStr.startsWith('+971')) {
        foundCountryCode = '+971';
        phoneWithoutCode = phoneStr.replace('+971', '');
        detectedCountry = 'UAE';
        detectedCurrency = 'AED';
      }
      else if (phoneStr.startsWith('971') && phoneStr.length > 10) {
        foundCountryCode = '+971';
        phoneWithoutCode = phoneStr.substring(3);
        detectedCountry = 'UAE';
        detectedCurrency = 'AED';
      }
      else if (phoneStr.startsWith('+61')) {
        foundCountryCode = '+61';
        phoneWithoutCode = phoneStr.replace('+61', '');
        detectedCountry = 'Australia';
        detectedCurrency = 'AUD';
      }
      else if (phoneStr.startsWith('61') && phoneStr.length > 10) {
        foundCountryCode = '+61';
        phoneWithoutCode = phoneStr.substring(2);
        detectedCountry = 'Australia';
        detectedCurrency = 'AUD';
      }
      else if (/^\d+$/.test(phoneStr)) {
        if (phoneStr.length === 10) {
          foundCountryCode = '+91';
          phoneWithoutCode = phoneStr;
          detectedCountry = 'India';
          detectedCurrency = 'INR';
        }
        else if (phoneStr.length === 12 && phoneStr.startsWith('91')) {
          foundCountryCode = '+91';
          phoneWithoutCode = phoneStr.substring(2);
          detectedCountry = 'India';
          detectedCurrency = 'INR';
        }
        else if (phoneStr.length === 11 && phoneStr.startsWith('0')) {
          foundCountryCode = '+91';
          phoneWithoutCode = phoneStr.substring(1);
          detectedCountry = 'India';
          detectedCurrency = 'INR';
        }
        else {
          foundCountryCode = '+91';
          phoneWithoutCode = phoneStr;
          detectedCountry = 'India';
          detectedCurrency = 'INR';
        }
      }
      
      phoneWithoutCode = phoneWithoutCode.replace(/\D/g, '');
      
      if (phoneWithoutCode.length > 10) {
        phoneWithoutCode = phoneWithoutCode.slice(-10);
      }
      
      console.log("📞 Setting phone - Code:", foundCountryCode, "Number:", phoneWithoutCode);
      
      setCountryCode(foundCountryCode);
      setPhoneNumber(phoneWithoutCode);
      
      setCountry(detectedCountry);
      setCurrency(detectedCurrency);
      
      console.log("📞 Phone state set successfully");
    } else {
      console.log("📞 No phone found in profile, using defaults");
      setCountryCode("+91");
      setPhoneNumber("");
      setCountry("India");
      setCurrency("INR");
    }

    setPhoneError("");
    setEmailError("");
    
    setHasAutoFilled(true);
    setAutoFillAttempted(true);
    
    console.log("✅ Auto-fill completed successfully");
  };

  // ============================================
  // FIXED: handleSubmit - Conditionally add USD fields
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    console.log("🔄 Starting checkout form submission...");

    if (!fullName || !email || !cifRequired || !brandingRequired || !currency) {
      alert("Please fill all required fields");
      return;
    }

    if (cartProducts.length === 0) {
      alert("Please add products to your cart before checkout.");
      setSubmitError("No products in cart");
      return;
    }

    const isPhoneValid = validatePhoneNumber(phoneNumber, countryCode);
    const isEmailValid = validateEmail(email);

    if (!isPhoneValid || !isEmailValid) {
      alert("Please enter valid phone number and email address.");
      return;
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    const displayPrices = getDisplayPrices();
    const currencySymbol = getCurrencySymbol();

    // FIXED: Conditionally add USD fields only when they exist
    const cartItemsDetails = cartProducts.map(cartProduct => {
      const config = cartProductConfigs[cartProduct.id] || {};
      const orderQuantity = productOrderQuantities[cartProduct.cartItemId || cartProduct.id] || 1;
      const analysis = analyzeProductData(cartProduct);
      
      let quantityDisplay = "";
      let actualQuantity = 0;
      let actualUnit = "";
      
      let packageQuantity = 1;
      if (cartProduct.selectedQuantity) {
        packageQuantity = parseFloat(cartProduct.selectedQuantity) || 1;
      } else if (config.quantity) {
        packageQuantity = parseFloat(config.quantity) || 1;
      }
      
      quantityDisplay = `${packageQuantity} ${cartProduct.quantityUnit || 'kg'}`;
      actualQuantity = packageQuantity * orderQuantity;
      actualUnit = cartProduct.quantityUnit || 'kg';

      let pricePerUnit = getPricePerUnit(cartProduct.id);
      
      const baseCurrency = cartProduct.productCurrency || 'INR';
      if (currency !== baseCurrency) {
        pricePerUnit = convertCurrency(pricePerUnit, baseCurrency, currency);
      }
      
      // Base item details - always include these
      const itemDetails = {
        productId: cartProduct.id,
        cartItemId: cartProduct.cartItemId,
        name: cartProduct.name,
        brandName: cartProduct.brandName || 'General',
        companyName: cartProduct.companyName,
        pricePerUnit: pricePerUnit,
        priceDisplay: `${currencySymbol}${pricePerUnit}/kg`,
        orderQuantity: orderQuantity,
        quantityDisplay: quantityDisplay,
        actualQuantity: actualQuantity,
        actualUnit: actualUnit,
        image: cartProduct.image,
        unit: cartProduct.unit,
        grade: cartProduct.selectedGradeDisplay || cartProduct.selectedGrade || "Standard",
        packing: cartProduct.selectedPacking || "Standard",
        origin: analysis.origin,
        packagingInfo: analysis.packagingInfo,
        productCurrency: analysis.currency,
        productType: analysis.productType,
        
        selectedGrade: cartProduct.selectedGrade || null,
        selectedGradePrice: cartProduct.selectedGradePrice || null,
        selectedGradeDisplay: cartProduct.selectedGradeDisplay || null,
        selectedPacking: cartProduct.selectedPacking || null,
        selectedQuantity: cartProduct.selectedQuantity || null,
        quantityUnit: cartProduct.quantityUnit || 'kg',
        isRice: cartProduct.isRice || false,
      };
      
      // Only add USD-specific fields if they actually exist (for USD products)
      if (cartProduct.price_usd_per_carton !== undefined) {
        itemDetails.price_usd_per_carton = cartProduct.price_usd_per_carton;
      }
      
      if (cartProduct.fob_price_usd !== undefined) {
        itemDetails.fob_price_usd = cartProduct.fob_price_usd;
      }
      
      if (cartProduct["Ex-Mill_usd"] !== undefined) {
        itemDetails["Ex-Mill_usd"] = cartProduct["Ex-Mill_usd"];
      }
      
      return itemDetails;
    });

    const totalQuantity = cartProducts.reduce((sum, prod) => {
      const orderQuantity = productOrderQuantities[prod.cartItemId || prod.id] || 1;
      let packageQuantity = parseFloat(prod.selectedQuantity) || 1;
      return sum + (packageQuantity * orderQuantity);
    }, 0);

    const subtotal = cartProducts.reduce((sum, prod) => {
      const orderQuantity = productOrderQuantities[prod.cartItemId || prod.id] || 1;
      
      let pricePerUnit = getPricePerUnit(prod.id);
      
      const baseCurrency = prod.productCurrency || 'INR';
      if (currency !== baseCurrency) {
        pricePerUnit = convertCurrency(pricePerUnit, baseCurrency, currency);
      }
      
      let packageQuantity = parseFloat(prod.selectedQuantity) || 1;
      
      return sum + (pricePerUnit * packageQuantity * orderQuantity);
    }, 0);

    const quoteData = {
      name: fullName,
      email: email,
      phone: fullPhoneNumber,
      country: country,
      state: state,
      city: city,
      pincode: pincode,
      cartItems: cartItemsDetails,
      itemCount: cartProducts.length,
      totalQuantity: totalQuantity,
      subtotal: subtotal,
      cifRequired: cifRequired,
      brandingRequired: brandingRequired,
      currency: currency,
      portOfLoading: portOfLoading,
      portOfDestination: portOfDestination,
      transportPrice: transportPrice !== "0-0" ? `${currencySymbol}${transportPrice} per unit` : "Not Selected",
      priceBreakdown: {
        note: "This is an estimated bill. Final pricing may vary.",
        originalPrice: `Original Price: ${currencySymbol}${formatNumber(subtotal)}`,
        itemCount: `${cartProducts.length} items in cart`,
        totalQuantity: `Total Quantity: ${totalQuantity} units`,
        ...(portOfLoading.portName && {
          portOfLoadingLine: `Port of Loading: ${portOfLoading.portName}, ${portOfLoading.state}, ${portOfLoading.country}`
        }),
        ...(portOfDestination.portName && {
          portOfDestinationLine: `Port of Destination: ${portOfDestination.portName}, ${portOfDestination.state}, ${portOfDestination.country}`
        }),
        ...(transportPrice !== "0-0" && {
          transportPriceLine: `Transport Price: ${currencySymbol}${transportPrice} per unit`
        }),
        ...(brandingRequired === "Yes" && {
          brandingCostLine: `Branding/Custom Printing: ${displayPrices.brandingCost}`
        }),
        ...(transportPrice !== "0-0" && {
          transportCostLine: `Transport Cost: ${displayPrices.transportCost}`
        }),
        ...(cifRequired === "Yes" && {
          shippingCostLine: `Shipping Cost: ${displayPrices.shippingCost}`,
          insuranceCostLine: `Insurance Cost: ${displayPrices.insuranceCost}`,
          taxesLine: `Taxes & Duties: ${displayPrices.taxes}`
        }),
        finalTotalLine: `Final Total: ${displayPrices.finalTotalPrice}`
      },
      additionalInfo: additionalInfo || "",
      userId: profile?.uid || "guest",
      userEmail: profile?.email || email,
      timestamp: Date.now(),
      date: new Date().toISOString(),
      readableDate: new Date().toLocaleString(),
      productType: "multiple",
      status: "new",
      source: "cart_checkout",
      isNew: true,
      hasAutoFilled: hasAutoFilled,
      profileUsed: !!profile,
      isCartOrder: true
    };

    console.log("📝 Checkout Quote Data:", quoteData);

    setIsSubmitting(true);
    try {
      console.log("📤 Submitting to Firebase...");
      const quoteId = await submitQuote(quoteData);
      console.log('✅ Quote submitted successfully with ID:', quoteId);

      let message = `Hello! I want a quote for ${cartProducts.length} items from my cart:
- Name: ${fullName}
- Email: ${email}
- Phone: ${fullPhoneNumber}
- Country: ${country}
- State: ${state}
- City: ${city}
- Pincode: ${pincode}
Items in Cart:
${cartProducts.map((prod, index) => {
        const orderQuantity = productOrderQuantities[prod.cartItemId || prod.id] || 1;
        
        let pricePerUnit = getPricePerUnit(prod.id);
        
        const baseCurrency = prod.productCurrency || 'INR';
        if (currency !== baseCurrency) {
          pricePerUnit = convertCurrency(pricePerUnit, baseCurrency, currency);
        }
        
        let packageQuantity = parseFloat(prod.selectedQuantity) || 1;
        const productTotal = pricePerUnit * packageQuantity * orderQuantity;
        const priceDisplay = `${currencySymbol}${productTotal.toFixed(2)}`;
        
        const brandInfo = prod.brandName && prod.brandName !== 'General' ? ` (Brand: ${prod.brandName})` : '';
        const gradeInfo = prod.selectedGradeDisplay ? ` (Grade: ${prod.selectedGradeDisplay})` : '';
        
        return `${index + 1}. ${prod.name}${brandInfo}${gradeInfo} (${prod.companyName}) - ${packageQuantity}${prod.quantityUnit} x ${orderQuantity} = ${priceDisplay}`;
      }).join('\n')}
- CIF Required: ${cifRequired}
- Brand Required: ${brandingRequired}
- Selected Currency: ${currency}
- Port of Loading: ${portOfLoading.portName ? `${portOfLoading.portName}, ${portOfLoading.state}, ${portOfLoading.country}` : "Not specified"}
- Port of Destination: ${portOfDestination.portName ? `${portOfDestination.portName}, ${portOfDestination.state}, ${portOfDestination.country}` : "Not specified"}
${transportPrice !== "0-0" ? `- Transport Price: ${currencySymbol}${transportPrice} per unit` : ""}
- Estimated Bill:
  • Original Price: ${displayPrices.originalPrice}
  • Items: ${cartProducts.length} products
  ${brandingRequired === "Yes" ? `• Branding/Custom Printing: ${displayPrices.brandingCost}` : ""}
  ${transportPrice !== "0-0" ? `• Transport Cost: ${displayPrices.transportCost}` : ""}
  ${cifRequired === "Yes" ? `• Shipping Cost: ${displayPrices.shippingCost}` : ""}
  ${cifRequired === "Yes" ? `• Insurance Cost: ${displayPrices.insuranceCost}` : ""}
  ${cifRequired === "Yes" ? `• Taxes & Duties: ${displayPrices.taxes}` : ""}
  • Final Total: ${displayPrices.finalTotalPrice}
${additionalInfo ? `- Additional Info: ${additionalInfo}` : ""}
Thank you!`;

      window.open(
  `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
  "_blank"
);

      alert(`✅ Order #${quoteId.substring(0, 8)} submitted successfully!`);

      if (onOrderSubmitted) {
        onOrderSubmitted(quoteId);
      }

      setShowThankYou(true);
      resetForm();
    } catch (err) {
      console.error("❌ Error submitting form:", err);
      alert(err.message || "Something went wrong while submitting your quote.");
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCifRequired("No");
    setCurrency("INR");
    setBrandingRequired("No");
    setAdditionalInfo("");
    setShippingCost("0.00");
    setInsuranceCost("0.00");
    setTaxes("0.00");
    setBrandingCost("0.00");
    setTransportCost("0.00");
    setTotalPrice("0.00");
    
    setPortOfLoading({ country: "", state: "", portName: "" });
    setPortOfDestination({ country: "", state: "", portName: "" });
    setTransportPrice("0-0");
    
    setSubmitError("");
    setCartProducts([]);
    setCartProductConfigs({});
    setProductOrderQuantities({});

    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setCountryCode("+91");
    setCountry("India");
    setState("");
    setCity("");
    setPincode("");
    setPhoneError("");
    setEmailError("");
    setHasAutoFilled(false);
    setAutoFillAttempted(false);
  };

  const handleClose = () => {
    resetForm();
    setShowThankYou(false);
    onClose();
  };

  useEffect(() => {
    calculateCartTotal();
  }, [cartProducts, cartProductConfigs, productOrderQuantities, cifRequired, currency, brandingRequired, transportPrice]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol();
  const displayPrices = getDisplayPrices();

  const cartSubtotal = cartProducts.reduce((sum, prod) => {
    const orderQuantity = productOrderQuantities[prod.cartItemId || prod.id] || 1;
    
    let pricePerUnit = getPricePerUnit(prod.id);
    
    let packageQuantity = parseFloat(prod.selectedQuantity) || 1;
    
    return sum + (pricePerUnit * packageQuantity * orderQuantity);
  }, 0);

  const cartTotalItems = cartProducts.reduce((sum, prod) => {
    const orderQuantity = productOrderQuantities[prod.cartItemId || prod.id] || 1;
    let packageQuantity = parseFloat(prod.selectedQuantity) || 1;
    return sum + (packageQuantity * orderQuantity);
  }, 0);

  return (
    <>
      <div className="buy-modal-overlay checkout-modal">
        <div className="buy-modal-container" ref={modalRef}>
          <button className="buy-modal-close-btn" onClick={handleClose} aria-label="Close modal">
            &times;
          </button>

          <div className="buy-modal-header">
            <h2 className="buy-modal-title">
              Checkout ({cartProducts.length} Items)
            </h2>
            <p className="buy-modal-subtitle">
              Fill out the form below to get a quote for {cartProducts.length} items
            </p>

            <div className="product-type-info">
              <small>🎁 Multiple Products Order</small>
            </div>
          </div>

          <div className="buy-modal-body">
            <div className="modal-layout">
              <div className="form-section-container" ref={formContainerRef}>
                <form onSubmit={handleSubmit}>
                  {profile && !hasAutoFilled && (
                    <div className="auto-fill-section">
                      <button
                        type="button"
                        className="auto-fill-btn"
                        onClick={handleAutoFillFromProfile}
                      >
                        🔄 Auto-fill from Profile
                      </button>
                      <small className="auto-fill-note">
                        Click to auto-fill your information from your profile.
                      </small>
                    </div>
                  )}

                  {submitError && (
                    <div className="submit-error-section">
                      <div className="error-message alert-error">
                        ⚠️ {submitError}
                      </div>
                    </div>
                  )}

                  <section className="form-section">
                    <h3 className="section-title">
                      <Package size={20} style={{ marginRight: '8px' }} />
                      Selected Products
                    </h3>

                    <div className="standard-products-display">
                      {cartProducts.map((cartProduct, index) => {
                        const config = cartProductConfigs[cartProduct.id] || {};
                        const orderQuantity = productOrderQuantities[cartProduct.cartItemId || cartProduct.id] || 1;
                        const analysis = analyzeProductData(cartProduct);
                        const productImage = cartProduct.image || analysis.productImage;
                        
                        const productCurrencySymbol = getProductCurrencySymbol(cartProduct);
                        
                        let pricePerUnit = getPricePerUnit(cartProduct.id);
                        
                        let packageQuantity = 1;
                        if (cartProduct.selectedQuantity) {
                          if (cartProduct.selectedQuantity === "custom") {
                            packageQuantity = parseFloat(config.customQuantity) || 1;
                          } else {
                            packageQuantity = parseFloat(cartProduct.selectedQuantity) || 1;
                          }
                        }
                        
                        const productSubtotal = pricePerUnit * packageQuantity;

                        const displayGrade = cartProduct.selectedGradeDisplay || cartProduct.selectedGrade || null;
                        const displayGradePrice = cartProduct.selectedGradePrice || null;
                        const displayPacking = cartProduct.selectedPacking || null;
                        const displayQuantity = cartProduct.selectedQuantity || null;
                        const displayQuantityUnit = cartProduct.quantityUnit || 'kg';

                        const isRiceProduct = cartProduct.isRice || 
                                             cartProduct.companyName?.toLowerCase().includes('siea') ||
                                             cartProduct.name?.toLowerCase().includes('rice');

                        return (
                          <div key={cartProduct.cartItemId || cartProduct.id} className="standard-product-item">
                            <div className="standard-product-image">
                              <div className="order-quantity-buttons">
                                <button
                                  type="button"
                                  className="order-quantity-btn"
                                  onClick={() => handleDecreaseOrderQuantity(cartProduct.cartItemId || cartProduct.id)}
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="order-quantity-display">{orderQuantity}</span>
                                <button
                                  type="button"
                                  className="order-quantity-btn"
                                  onClick={() => handleIncreaseOrderQuantity(cartProduct.cartItemId || cartProduct.id)}
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                              <img
                                src={productImage}
                                alt={cartProduct.name}
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&auto=format&fit=crop&q=60';
                                }}
                              />
                              <div className="product-badge">
                                {cartProduct.companyName === 'Nut Walker' ? '🥜 Dry Fruits' :
                                 cartProduct.companyName === 'Heritage' ? '🌾 Heritage' :
                                 cartProduct.companyName === 'Akil Drinks' ? '🥤 Beverages' :
                                 cartProduct.companyName === 'SIEA' ? '🍚 Rice' : 
                                 isRiceProduct ? '🍚 Rice' : '⭐ Premium'}
                              </div>
                            </div>

                            <div className="standard-product-details">
                              <div className="standard-product-header">
                                <h4 className="standard-product-name">{cartProduct.name}</h4>
                                <span className="standard-product-brand">{cartProduct.companyName}</span>
                                
                                {cartProduct.brandName && cartProduct.brandName !== 'General' && (
                                  <span className="standard-product-brand-name" style={{ 
                                    color: '#10b981', 
                                    fontWeight: 'bold',
                                    display: 'block',
                                    marginTop: '4px',
                                    fontSize: '1rem'
                                  }}>
                                    Brand: {cartProduct.brandName}
                                  </span>
                                )}
                                
                                {analysis.origin && (
                                  <span className="standard-product-origin">Origin: {analysis.origin}</span>
                                )}
                              </div>

                              <div className="standard-product-price-section">
                                <div className="standard-price-display">
                                  <span className="standard-price-amount">
                                    {productCurrencySymbol}{pricePerUnit}/kg
                                  </span>
                                  <span className="standard-price-unit">each</span>
                                </div>
                                
                                <div className="standard-config-display">
                                  {displayGrade && (
                                    <div className="config-row readonly-config">
                                      <span className="config-label">Selected Grade:</span>
                                      <span className="config-value-readonly">
                                        {displayGrade} 
                                        {displayGradePrice && ` (${productCurrencySymbol}${displayGradePrice}/kg)`}
                                      </span>
                                    </div>
                                  )}

                                  {displayPacking && (
                                    <div className="config-row readonly-config">
                                      <span className="config-label">Selected Packing:</span>
                                      <span className="config-value-readonly">
                                        {displayPacking}
                                      </span>
                                    </div>
                                  )}

                                  {displayQuantity && (
                                    <div className="config-row readonly-config">
                                      <span className="config-label">Selected Quantity:</span>
                                      <span className="config-value-readonly">
                                        {displayQuantity} {displayQuantityUnit}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="standard-total-price">
                                  <span className="total-label">
                                    Total ({orderQuantity} × {displayQuantity} {displayQuantityUnit}):
                                  </span>
                                  <span className="total-amount">
                                    {productCurrencySymbol}{productSubtotal.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              <div className="standard-product-meta">
                                {analysis.packagingInfo && (
                                  <div className="meta-item">
                                    <span className="meta-label">Packaging:</span>
                                    <span className="meta-value">{analysis.packagingInfo}</span>
                                  </div>
                                )}
                                {cartProduct.brandName && cartProduct.brandName !== 'General' && (
                                  <div className="meta-item">
                                    <span className="meta-label">Brand:</span>
                                    <span className="meta-value" style={{ color: '#10b981' }}>{cartProduct.brandName}</span>
                                  </div>
                                )}
                                <div className="meta-item">
                                  <span className="meta-label">Order Qty:</span>
                                  <span className="meta-value">{orderQuantity} units</span>
                                </div>
                              </div>
                            </div>

                            <div className="standard-product-actions">
                              <button
                                type="button"
                                className="standard-remove-btn"
                                onClick={() => handleRemoveCartProduct(cartProduct.cartItemId || cartProduct.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="cart-summary-standard">
                        <div className="summary-row">
                          <span className="summary-label">Total Items:</span>
                          <span className="summary-value">{cartProducts.length}</span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label">Total Quantity:</span>
                          <span className="summary-value">{cartTotalItems} {cartProducts[0]?.quantityUnit || 'kg'}</span>
                        </div>
                        <div className="summary-row total">
                          <span className="summary-label">Subtotal:</span>
                          <span className="summary-value">{currencySymbol}{cartSubtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="form-section">
                    <h3 className="section-title">Contact Information</h3>

                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={handleFullNameChange}
                        required
                        className="form-input"
                      />
                      {hasAutoFilled && (
                        <div className="profile-autofill-note">
                          <small>✓ Auto-filled from profile</small>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email Address *</label>
                      <input
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={handleEmailChange}
                        required
                        className="form-input"
                      />
                      {hasAutoFilled && (
                        <div className="profile-autofill-note">
                          <small>✓ Auto-filled from profile</small>
                        </div>
                      )}
                      {emailError && <div className="error-message">{emailError}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Country *</label>
                      <select
                        value={country}
                        onChange={handleCountryNameChange}
                        required
                        className="form-select"
                      >
                        <option value="">Select Country</option>
                        {countryNames.map((countryOption) => (
                          <option key={countryOption.code} value={countryOption.name}>
                            {countryOption.name}
                          </option>
                        ))}
                      </select>
                      {hasAutoFilled && (
                        <div className="profile-autofill-note">
                          <small>✓ Auto-filled from profile</small>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">State/Province *</label>
                      <input
                        type="text"
                        placeholder="Enter your state/province"
                        value={state}
                        onChange={handleStateChangeInput}
                        required
                        className="form-input"
                      />
                      {hasAutoFilled && (
                        <div className="profile-autofill-note">
                          <small>✓ Auto-filled from profile</small>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">City/Town *</label>
                      <input
                        type="text"
                        placeholder="Enter your city/town"
                        value={city}
                        onChange={handleCityChange}
                        required
                        className="form-input"
                      />
                      {hasAutoFilled && (
                        <div className="profile-autofill-note">
                          <small>✓ Auto-filled from profile</small>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Pincode/ZIP *</label>
                      <input
                        type="text"
                        placeholder="Enter your pincode/ZIP"
                        value={pincode}
                        onChange={handlePincodeChange}
                        required
                        className="form-input"
                      />
                      {hasAutoFilled && (
                        <div className="profile-autofill-note">
                          <small>✓ Auto-filled from profile</small>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <div className="phone-input-group">
                        <select
                          value={countryCode}
                          onChange={handleCountryChange}
                          className="country-code-select"
                        >
                          {countryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.flag} {option.value} ({option.name})
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          placeholder={`Phone number (${getCurrentCountry()?.length || 10} digits)`}
                          value={phoneNumber}
                          onChange={handlePhoneChange}
                          maxLength={getCurrentCountry()?.length || 10}
                          required
                          className="form-input phone-input"
                        />
                      </div>
                      {hasAutoFilled && (
                        <div className="profile-autofill-note">
                          <small>✓ Auto-filled from profile</small>
                        </div>
                      )}
                      {phoneError && <div className="error-message">{phoneError}</div>}
                    </div>

                    {hasAutoFilled && (
                      <div className="auto-fill-confirmation" style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid #10b981',
                        borderRadius: '8px',
                        padding: '12px',
                        marginTop: '16px',
                        color: '#10b981',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <Check size={18} />
                        <span>Profile data has been auto-filled successfully!</span>
                      </div>
                    )}
                  </section>

                  <section className="form-section">
                    <h3 className="section-title">Order Requirements</h3>

                    <div className="form-group">
                      <label className="form-label">Port of Loading</label>
                      <div className="transport-selection-group">
                        <div className="transport-row">
                          <div className="transport-column">
                            <label className="form-label">Country</label>
                            <select
                              value={portOfLoading.country}
                              onChange={(e) => handlePortOfLoadingChange('country', e.target.value)}
                              className="form-select"
                            >
                              <option value="">Select Country</option>
                              {countryNames.map((countryOption) => (
                                <option key={`loading-${countryOption.code}`} value={countryOption.name}>
                                  {countryOption.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="transport-column">
                            <label className="form-label">State</label>
                            <input
                              type="text"
                              placeholder="Enter state"
                              value={portOfLoading.state}
                              onChange={(e) => handlePortOfLoadingChange('state', e.target.value)}
                              className="form-input"
                            />
                          </div>
                          <div className="transport-column">
                            <label className="form-label">Port Name</label>
                            <input
                              type="text"
                              placeholder="Enter port name"
                              value={portOfLoading.portName}
                              onChange={(e) => handlePortOfLoadingChange('portName', e.target.value)}
                              className="form-input"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Port of Destination</label>
                      <div className="transport-selection-group">
                        <div className="transport-row">
                          <div className="transport-column">
                            <label className="form-label">Country</label>
                            <select
                              value={portOfDestination.country}
                              onChange={(e) => handlePortOfDestinationChange('country', e.target.value)}
                              className="form-select"
                            >
                              <option value="">Select Country</option>
                              {countryNames.map((countryOption) => (
                                <option key={`destination-${countryOption.code}`} value={countryOption.name}>
                                  {countryOption.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="transport-column">
                            <label className="form-label">State</label>
                            <input
                              type="text"
                              placeholder="Enter state"
                              value={portOfDestination.state}
                              onChange={(e) => handlePortOfDestinationChange('state', e.target.value)}
                              className="form-input"
                            />
                          </div>
                          <div className="transport-column">
                            <label className="form-label">Port Name</label>
                            <input
                              type="text"
                              placeholder="Enter port name"
                              value={portOfDestination.portName}
                              onChange={(e) => handlePortOfDestinationChange('portName', e.target.value)}
                              className="form-input"
                            />
                          </div>
                        </div>
                        {transportPrice !== "0-0" && (
                          <div className="transport-price-info">
                            <small>Transport Price: {currencySymbol}{transportPrice} per unit</small>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">CIF Required (If Any) *</label>
                      <select value={cifRequired} onChange={handleCifChange} required className="form-select">
                        <option value="">Select Option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                      <div className="cif-info">
                        <small>CIF includes shipping and insurance costs to your destination port</small>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Brand Required (If Any) *</label>
                      <select value={brandingRequired} onChange={handleBrandingChange} required className="form-select">
                        <option value="">Select Option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                      <div className="branding-info">
                        <small>Add your logo/branding to the packaging - Additional charge: {currencySymbol}35 per order</small>
                        {brandingRequired === "Yes" && (
                          <div className="branding-cost-preview">
                            <small>Branding/custom printing cost: {displayPrices.brandingCost}</small>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Currency *</label>
                      <select value={currency} onChange={handleCurrencyChange} required className="form-select">
                        <option value="">Select Currency</option>
                        {currencyOptions.map((curr, i) => (
                          <option key={i} value={curr.value}>
                            {curr.value} ({curr.symbol}) - {curr.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Additional Information</label>
                      <textarea
                        placeholder="Enter any additional information here"
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                        className="form-textarea"
                        rows="4"
                      />
                    </div>
                  </section>

                  <div className="form-actions">
                    <button type="submit" className="submit-btn" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="btn-loading">
                          <span className="btn-spinner"></span>
                          Submitting...
                        </span>
                      ) : (
                        `Order Now (${cartProducts.length} Items)`
                      )}
                    </button>

                    <button type="button" onClick={handleClose} className="cancel-btn">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>

              <div className="estimate-section-container" ref={estimateContainerRef}>
                <div className="price-breakdown-section">
                  <h4 className="price-breakdown-title">
                    Cart Summary ({cartProducts.length} Items)
                  </h4>

                  <div className="estimate-note">
                    <small>This is an estimated bill. Final pricing may vary.</small>
                    {transportPrice !== "0-0" && (
                      <div className="transport-price-display">
                        <small>Transport Price: {currencySymbol}{transportPrice} per unit</small>
                      </div>
                    )}
                  </div>

                  <div className="price-breakdown-grid">
                    <div className="price-item">
                      <span className="price-label">Items in Cart:</span>
                      <span className="price-value">{cartProducts.length} products</span>
                    </div>

                    <div className="price-item">
                      <span className="price-label">Total Quantity:</span>
                      <span className="price-value">{cartTotalItems} {cartProducts[0]?.quantityUnit || 'kg'}</span>
                    </div>

                    {portOfLoading.portName && (
                      <div className="price-item">
                        <span className="price-label">Port of Loading:</span>
                        <span className="price-value">{portOfLoading.portName}, {portOfLoading.state}, {portOfLoading.country}</span>
                      </div>
                    )}

                    {portOfDestination.portName && (
                      <div className="price-item">
                        <span className="price-label">Port of Destination:</span>
                        <span className="price-value">{portOfDestination.portName}, {portOfDestination.state}, {portOfDestination.country}</span>
                      </div>
                    )}

                    <div className="price-item">
                      <span className="price-label">Cart Subtotal:</span>
                      <span className="price-value">{displayPrices.originalPrice}</span>
                    </div>

                    {brandingRequired === "Yes" && (
                      <div className="price-item branding-costs">
                        <span className="price-label">Branding/Custom Printing:</span>
                        <span className="price-value">{displayPrices.brandingCost}</span>
                      </div>
                    )}

                    {transportPrice !== "0-0" && (
                      <div className="price-item transport-costs">
                        <span className="price-label">Transport Cost:</span>
                        <span className="price-value">{displayPrices.transportCost}</span>
                      </div>
                    )}

                    {cifRequired === "Yes" && (
                      <>
                        <div className="price-item">
                          <span className="price-label">Shipping Cost:</span>
                          <span className="price-value">{displayPrices.shippingCost}</span>
                        </div>
                        <div className="price-item">
                          <span className="price-label">Insurance Cost:</span>
                          <span className="price-value">{displayPrices.insuranceCost}</span>
                        </div>
                        <div className="price-item">
                          <span className="price-label">Taxes & Duties:</span>
                          <span className="price-value">{displayPrices.taxes}</span>
                        </div>
                      </>
                    )}

                    <div className="price-item final-total">
                      <span className="price-label">Final Total:</span>
                      <span className="price-value">{displayPrices.finalTotalPrice}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ThankYouPopup isOpen={showThankYou} onClose={() => setShowThankYou(false)} />

      <style>{`
        .readonly-config {
          background: rgba(30, 41, 59, 0.8);
          padding: 8px 12px;
          border-radius: 6px;
          border-left: 3px solid #4096e2ff;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .config-value-readonly {
          color: #60a5fa;
          font-weight: 500;
          background: rgba(64, 150, 226, 0.1);
          padding: 4px 10px;
          border-radius: 4px;
          display: inline-block;
        }
        
        .standard-config-display {
          margin: 10px 0;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 8px;
          padding: 10px;
          border: 1px solid rgba(64, 150, 226, 0.2);
        }
        
        .config-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        
        .config-row:last-child {
          margin-bottom: 0;
        }
        
        .config-label {
          color: #94a3b8;
          font-size: 0.9rem;
        }
        
        .config-value-readonly {
          color: #60a5fa;
          font-weight: 500;
          font-size: 0.95rem;
        }
        
        .standard-product-brand-name {
          color: #10b981;
          font-weight: bold;
          font-size: 1rem;
          margin-top: 4px;
        }

        .auto-fill-confirmation {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
          border-radius: 8px;
          padding: 12px;
          margin-top: 16px;
          color: #10b981;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .profile-autofill-note {
          margin-top: 4px;
          color: #10b981;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .profile-autofill-note small {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .profile-autofill-note small::before {
          content: "✓";
          font-weight: bold;
        }
      `}</style>
    </>
  );
};

export default CheckoutModal;