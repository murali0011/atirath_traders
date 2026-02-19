// components/SingleProductBuyModal.jsx
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
import { ShoppingBag, Package, Trash2, Plus, Minus, X, Star, Check } from 'lucide-react';
import "../styles/form.css";

const SingleProductBuyModal = ({ isOpen, onClose, product, profile, onOrderSubmitted }) => {
  // State declarations
  const [grade, setGrade] = useState("");
  const [packing, setPacking] = useState("");
  const [quantity, setQuantity] = useState("");
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
  const [gradePrice, setGradePrice] = useState("0.00");
  const [packingPrice, setPackingPrice] = useState("0.00");
  const [quantityPrice, setQuantityPrice] = useState("0.00");
  const [totalPrice, setTotalPrice] = useState("0.00");
  const [currency, setCurrency] = useState("USD");
  const [brandingRequired, setBrandingRequired] = useState("No");
  const [shippingCost, setShippingCost] = useState("0.00");
  const [insuranceCost, setInsuranceCost] = useState("0.00");
  const [taxes, setTaxes] = useState("0.00");
  const [baseProductPrice, setBaseProductPrice] = useState("0.00");
  const [customQuantity, setCustomQuantity] = useState("");
  const [brandingCost, setBrandingCost] = useState("0.00");
  const [transportCost, setTransportCost] = useState("0.00");
  const [productCurrency, setProductCurrency] = useState("USD");
  const [productOrigin, setProductOrigin] = useState("");
  const [availableGrades, setAvailableGrades] = useState([]);
  const [hasGrades, setHasGrades] = useState(false);
  const [productPriceDisplay, setProductPriceDisplay] = useState("");
  const [quantityOptions, setQuantityOptions] = useState([]);
  const [packingOptions, setPackingOptions] = useState([]);
  const [submitError, setSubmitError] = useState("");
  const [productType, setProductType] = useState('default');

  // ============================================
  // 🔥 NEW: Port of Loading and Port of Destination
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

  // New state for profile fields
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  // New state to track if profile data has been auto-filled
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  // New state for product image
  const [productImage, setProductImage] = useState("");

  const [orderQuantity, setOrderQuantity] = useState(1);

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

  const analyzeProductData = () => {
    if (!product) return {};
    console.log("📦 Raw Product Data:", product);

    let priceValue = 0;
    let currencyDetected = "USD";
    let priceDisplay = "";

    if (product.price_usd_per_carton !== undefined) {
      priceValue = product.price_usd_per_carton;
      currencyDetected = "USD";
      priceDisplay = `$${priceValue} per carton`;
    } else if (product.fob_price_usd !== undefined) {
      priceValue = product.fob_price_usd;
      currencyDetected = "USD";
      priceDisplay = `$${priceValue} per carton`;
    } else if (product["Ex-Mill_usd"] !== undefined) {
      priceValue = product["Ex-Mill_usd"];
      currencyDetected = "USD";
      priceDisplay = `$${priceValue} EX-MILL per carton`;
    } 
    else if (product.price && typeof product.price === 'object') {
      if (product.price.min !== undefined && product.price.max !== undefined) {
        priceValue = (product.price.min + product.price.max) / 2 / 100;
        currencyDetected = "INR";
        priceDisplay = `₹${product.price.min / 100} - ₹${product.price.max / 100} per kg`;
      }
    } else if (typeof product.price === 'string') {
      if (product.price.includes('$')) {
        currencyDetected = "USD";
        priceValue = parseFloat(product.price.replace(/[^\d.-]/g, '')) || 0;
      } else if (product.price.includes('₹') || product.price.includes('Rs') || product.price.includes('INR')) {
        currencyDetected = "INR";
        priceValue = parseFloat(product.price.replace(/[^\d.-]/g, '')) || 0;
      } else if (product.price.includes('€')) {
        currencyDetected = "EUR";
        priceValue = parseFloat(product.price.replace(/[^\d.-]/g, '')) || 0;
      } else if (product.price.includes('£')) {
        currencyDetected = "GBP";
        priceValue = parseFloat(product.price.replace(/[^\d.-]/g, '')) || 0;
      } else {
        priceValue = parseFloat(product.price) || 0;
      }
      priceDisplay = product.price;
    } else if (typeof product.price === 'number') {
      priceValue = product.price;
      priceDisplay = `$${priceValue}`;
    }

    let origin = product.origin ||
      product.Origin ||
      product.country_of_origin ||
      "India";

    let grades = [];
    let hasGradesField = false;

    if (product.grades && Array.isArray(product.grades) && product.grades.length > 0) {
      grades = product.grades.map(grade => ({
        value: grade.grade || grade.name || grade.type || "Standard",
        price: grade.price_inr || grade.price || "1.00",
        currency: grade.currency || currencyDetected
      }));
      hasGradesField = true;
    }

    let packagingInfo = "";
    if (product.packaging) {
      if (typeof product.packaging === 'object') {
        if (product.packaging.type) {
          packagingInfo = product.packaging.type;
        } else if (product.packaging.units_per_carton) {
          packagingInfo = `${product.packaging.units_per_carton} units per carton`;
          if (product.packaging.unit_weight_g) {
            packagingInfo += ` (${product.packaging.unit_weight_g}g each)`;
          }
        }
      } else if (typeof product.packaging === 'string') {
        packagingInfo = product.packaging;
      }
    } else if (product.pack_type) {
      packagingInfo = product.pack_type;
    }

    const prodType = getProductType();

    let productImage = product.image ||
      product.imageUrl ||
      product.productImage ||
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&auto=format&fit=crop&q=60";

    return {
      priceValue,
      currency: currencyDetected,
      priceDisplay,
      origin,
      grades,
      hasGrades: hasGradesField,
      packagingInfo,
      productType: prodType,
      rawPrice: product.price,
      productImage
    };
  };

  const getProductType = () => {
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

  const getQuantityOptionsFromProduct = () => {
    const analysis = analyzeProductData();
    const productName = product?.name?.toLowerCase() || '';

    const isCartonBased = product?.price_usd_per_carton ||
      product?.fob_price_usd ||
      product?.["Ex-Mill_usd"] ||
      (product?.packaging && product.packaging.units_per_carton);

    if (isCartonBased) {
      const unitsPerCarton = product?.packaging?.units_per_carton || 48;
      return [
        { value: "1", label: `1 Carton (${unitsPerCarton} units)`, multiplier: 1, unit: "cartons", actualQuantity: 1, actualUnit: "cartons" },
        { value: "5", label: `5 Cartons (${unitsPerCarton * 5} units)`, multiplier: 5, unit: "cartons", actualQuantity: 5, actualUnit: "cartons" },
        { value: "10", label: `10 Cartons (${unitsPerCarton * 10} units)`, multiplier: 10, unit: "cartons", actualQuantity: 10, actualUnit: "cartons" },
        { value: "20", label: `20 Cartons (${unitsPerCarton * 20} units)`, multiplier: 20, unit: "cartons", actualQuantity: 20, actualUnit: "cartons" },
        { value: "custom", label: "Custom Quantity", multiplier: 1, unit: "cartons", actualQuantity: 0, actualUnit: "cartons" }
      ];
    }

    if (analysis.productType === 'rice') {
      return [
        { value: "1", label: "1 kg", multiplier: 1, unit: "kg", actualQuantity: 1, actualUnit: "kg" },
        { value: "5", label: "5 kg", multiplier: 5, unit: "kg", actualQuantity: 5, actualUnit: "kg" },
        { value: "10", label: "10 kg", multiplier: 10, unit: "kg", actualQuantity: 10, actualUnit: "kg" },
        { value: "25", label: "25 kg", multiplier: 25, unit: "kg", actualQuantity: 25, actualUnit: "kg" },
        { value: "50", label: "50 kg", multiplier: 50, unit: "kg", actualQuantity: 50, actualUnit: "kg" },
        { value: "custom", label: "Custom Quantity", multiplier: 1, unit: "kg", actualQuantity: 0, actualUnit: "kg" }
      ];
    }

    let options = getQuantityOptions(analysis.productType, productName);
    return options;
  };

  const getPackingOptionsFromProduct = () => {
    const analysis = analyzeProductData();
    const productType = analysis.productType;
    const productName = product?.name?.toLowerCase() || '';

    if (productType === 'rice') {
      return getPackingOptions('rice', productName);
    }

    let firebasePacking = "";

    if (product?.pack_type) {
      firebasePacking = product.pack_type;
    } else if (product?.packaging) {
      if (typeof product.packaging === 'string') {
        firebasePacking = product.packaging;
      } else if (typeof product.packaging === 'object' && product.packaging.type) {
        firebasePacking = product.packaging.type;
      }
    }

    if (firebasePacking) {
      return [
        { value: firebasePacking, price: "0" }
      ];
    }

    return getPackingOptions(productType, productName);
  };

  const getGradesFromProduct = () => {
    const analysis = analyzeProductData();

    if (analysis.hasGrades && analysis.grades.length > 0) {
      return analysis.grades;
    }

    const productType = analysis.productType;
    if (productType === 'rice') {
      return getAvailableGrades(productType, product);
    }

    return [];
  };

  const getCurrencySymbol = () => {
    const selectedCurrency = currencyOptions.find(curr => curr.value === currency);
    return selectedCurrency ? selectedCurrency.symbol : "$";
  };

  const getProductCurrencySymbol = () => {
    const analysis = analyzeProductData();
    const productCurr = analysis.currency;
    const selectedCurrency = currencyOptions.find(curr => curr.value === productCurr);
    return selectedCurrency ? selectedCurrency.symbol : "$";
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

  const getPricePerUnit = () => {
    const analysis = analyzeProductData();
    let price = analysis.priceValue;

    if (product?.price_usd_per_carton || product?.fob_price_usd || product?.["Ex-Mill_usd"]) {
      return price;
    }

    if (analysis.productType === 'rice') {
      return price;
    }

    return price;
  };

  const calculateQuantityPrice = (quantityValue, gradeMultiplier, customQty = null) => {
    const pricePerUnit = getPricePerUnit();
    const analysis = analyzeProductData();

    let actualUnits = 0;
    
    if (quantityValue === "custom") {
      actualUnits = parseFloat(customQty) || parseFloat(customQuantity) || 0;
    } else {
      const selectedQuantity = quantityOptions.find(q => q.value === quantityValue);
      if (!selectedQuantity) return 0;
      
      actualUnits = selectedQuantity.actualQuantity || parseFloat(selectedQuantity.value) || 0;
    }

    if (actualUnits <= 0) return 0;

    return actualUnits * pricePerUnit * gradeMultiplier * orderQuantity;
  };

  const calculateShippingCost = (quantityValue, productValue, customQty = null) => {
    if (!quantityValue || cifRequired !== "Yes") return 0;

    let actualQuantity = 0;
    if (quantityValue === "custom") {
      actualQuantity = parseFloat(customQty) || parseFloat(customQuantity) || 0;
    } else {
      const selectedQuantity = quantityOptions.find(q => q.value === quantityValue);
      if (!selectedQuantity) return 0;
      actualQuantity = selectedQuantity.actualQuantity || 0;
    }

    if (actualQuantity <= 0) return 0;

    const analysis = analyzeProductData();
    const productType = analysis.productType;

    let baseRate = 0;
    const shippingRates = {
      oil: 1.5,
      rice: 2.5,
      pulses: 2,
      spices: 3,
      dryfruits: 3.5,
      tea: 4,
      beverages: 0.8,
      default: 2
    };

    baseRate = shippingRates[productType] || shippingRates.default;
    return Math.max(actualQuantity * baseRate * orderQuantity, productValue * 0.02);
  };

  const calculateInsuranceCost = (productValue) => {
    if (cifRequired !== "Yes") return 0;
    return productValue * 0.005;
  };

  const calculateTaxes = (subtotal) => {
    if (cifRequired !== "Yes") return 0;
    return subtotal * 0.03;
  };

  const calculateBrandingCost = (brandingRequiredValue) => {
    if (brandingRequiredValue === "Yes") {
      return 35 * orderQuantity;
    }
    return 0;
  };

  const calculateTransportCost = (quantityValue, transportPriceRange, unitType, customQty = null) => {
    if (!quantityValue || !transportPriceRange || transportPriceRange === "0-0") {
      return 0;
    }

    let actualQuantity = 0;
    if (quantityValue === "custom") {
      actualQuantity = parseFloat(customQty) || parseFloat(customQuantity) || 0;
    } else {
      const selectedQuantity = quantityOptions.find(q => q.value === quantityValue);
      if (!selectedQuantity) return 0;
      actualQuantity = selectedQuantity.actualQuantity || 0;
    }

    if (actualQuantity <= 0) return 0;

    const [minPrice, maxPrice] = transportPriceRange.split('-').map(price => parseFloat(price.trim()));
    if (isNaN(minPrice) || isNaN(maxPrice)) return 0;

    const averagePrice = (minPrice + maxPrice) / 2;
    return actualQuantity * averagePrice * orderQuantity;
  };

  const calculatePrices = () => {
    const analysis = analyzeProductData();
    const productType = analysis.productType;

    let gradePriceValue = 0;
    let packingPriceValue = 0;
    let quantityPriceValue = 0;
    let shippingCostValue = 0;
    let insuranceCostValue = 0;
    let taxesValue = 0;
    let brandingCostValue = 0;
    let transportCostValue = 0;

    const pricePerUnit = getPricePerUnit();
    let gradeMultiplier = 1;

    if (grade && analysis.hasGrades) {
      const selectedGrade = analysis.grades.find(g => g.value === grade);
      if (selectedGrade) {
        gradeMultiplier = parseFloat(selectedGrade.price) / pricePerUnit;
      }
    }

    gradePriceValue = pricePerUnit * gradeMultiplier;

    if (packing) {
      const selectedPacking = packingOptions.find(p => p.value === packing);
      if (selectedPacking) {
        packingPriceValue = parseFloat(selectedPacking.price || 0) * orderQuantity;
      }
    }

    quantityPriceValue = calculateQuantityPrice(quantity, gradeMultiplier, customQuantity);

    brandingCostValue = calculateBrandingCost(brandingRequired);

    const productName = product?.name?.toLowerCase() || '';
    const unitType = getUnitType(productType, productName);
    transportCostValue = calculateTransportCost(quantity, transportPrice, unitType, customQuantity);

    if (cifRequired === "Yes") {
      shippingCostValue = calculateShippingCost(quantity, quantityPriceValue, customQuantity);
      insuranceCostValue = calculateInsuranceCost(quantityPriceValue);
      taxesValue = calculateTaxes(quantityPriceValue + packingPriceValue + brandingCostValue + transportCostValue);
    }

    const subtotal = quantityPriceValue + packingPriceValue + brandingCostValue + shippingCostValue + insuranceCostValue + taxesValue + transportCostValue;

    setGradePrice(gradePriceValue.toFixed(2));
    setPackingPrice(packingPriceValue.toFixed(2));
    setQuantityPrice(quantityPriceValue.toFixed(2));
    setShippingCost(shippingCostValue.toFixed(2));
    setInsuranceCost(insuranceCostValue.toFixed(2));
    setTaxes(taxesValue.toFixed(2));
    setBrandingCost(brandingCostValue.toFixed(2));
    setTransportCost(transportCostValue.toFixed(2));
    setTotalPrice(subtotal.toFixed(2));
  };

  const getDisplayPrices = () => {
    const analysis = analyzeProductData();
    const productCurrencySymbol = getProductCurrencySymbol();
    const selectedCurrencySymbol = getCurrencySymbol();

    return {
      baseProductPrice: `${productCurrencySymbol}${formatNumber(analysis.priceValue)}`,
      gradePrice: `${selectedCurrencySymbol}${formatNumber(gradePrice)}`,
      packingPrice: `${selectedCurrencySymbol}${formatNumber(packingPrice)}`,
      quantityPrice: `${selectedCurrencySymbol}${formatNumber(quantityPrice)}`,
      shippingCost: cifRequired === "Yes" ? `${selectedCurrencySymbol}${formatNumber(shippingCost)}` : "Not Required",
      insuranceCost: cifRequired === "Yes" ? `${selectedCurrencySymbol}${formatNumber(insuranceCost)}` : "Not Required",
      taxes: cifRequired === "Yes" ? `${selectedCurrencySymbol}${formatNumber(taxes)}` : "Not Required",
      brandingCost: brandingRequired === "Yes" ? `${selectedCurrencySymbol}${formatNumber(brandingCost)}` : "Not Required",
      transportCost: transportPrice !== "0-0" ? `${selectedCurrencySymbol}${formatNumber(transportCost)}` : "Not Required",
      totalPrice: `${selectedCurrencySymbol}${formatNumber(totalPrice)}`,
      finalTotalPrice: `${selectedCurrencySymbol}${formatNumber(totalPrice)}`
    };
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

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    setQuantity(value);
    if (value !== "custom") {
      setCustomQuantity("");
    }
  };

  const handleCustomQuantityChange = (e) => {
    const value = e.target.value;
    setCustomQuantity(value);
  };

  const handleGradeChange = (e) => {
    setGrade(e.target.value);
  };

  const handlePackingChange = (e) => {
    setPacking(e.target.value);
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

  // ============================================
  // 🔥 NEW: Port of Loading and Destination Handlers
  // ============================================
  const handlePortOfLoadingChange = (field, value) => {
    setPortOfLoading(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (portOfLoading.country && portOfLoading.state && portOfDestination.country && portOfDestination.state) {
      const analysis = analyzeProductData();
      const unitType = getUnitType(analysis.productType, product?.name?.toLowerCase() || '');
      setTransportPrice(getTransportPrice(portOfLoading.state, portOfDestination.state, unitType));
    }
  };

  const handlePortOfDestinationChange = (field, value) => {
    setPortOfDestination(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (portOfLoading.country && portOfLoading.state && portOfDestination.country && portOfDestination.state) {
      const analysis = analyzeProductData();
      const unitType = getUnitType(analysis.productType, product?.name?.toLowerCase() || '');
      setTransportPrice(getTransportPrice(portOfLoading.state, portOfDestination.state, unitType));
    }
  };

  const handleIncreaseOrderQuantity = () => {
    setOrderQuantity(prev => prev + 1);
  };

  const handleDecreaseOrderQuantity = () => {
    if (orderQuantity > 1) {
      setOrderQuantity(prev => prev - 1);
    }
  };

  const getQuantityUnit = () => {
    const analysis = analyzeProductData();

    const isCartonBased = product?.price_usd_per_carton ||
      product?.fob_price_usd ||
      product?.["Ex-Mill_usd"];

    if (isCartonBased) {
      return "cartons";
    }

    const productType = analysis.productType;
    if (analysis.productType === 'rice') {
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

  const getProductOrigin = () => {
    const analysis = analyzeProductData();
    return analysis.origin;
  };

  const handleAutoFillFromProfile = () => {
    if (!profile) return;

    console.log('📋 Auto-filling form from profile:', profile);

    setFullName(profile.name || "");
    setEmail(profile.email || "");
    setCountry(profile.country || "India");
    setState(profile.state || "");
    setCity(profile.city || "");
    setPincode(profile.pincode || "");

    if (profile.phone) {
      const phoneStr = profile.phone.toString();
      let foundCountryCode = "+91";
      const matchedCountry = countryOptions.find((opt) => phoneStr.startsWith(opt.value));

      if (matchedCountry) {
        foundCountryCode = matchedCountry.value;
        const phoneWithoutCode = phoneStr.replace(matchedCountry.value, "");
        setPhoneNumber(phoneWithoutCode);
        setCountryCode(foundCountryCode);
        if (matchedCountry.currency) {
          setCurrency(matchedCountry.currency);
        }
      } else {
        setCountryCode('+91');
        setPhoneNumber(phoneStr);
        setCountry('India');
      }
    } else {
      setCountryCode("+91");
      setPhoneNumber("");
    }

    setPhoneError("");
    setEmailError("");
    setHasAutoFilled(true);
  };

  useEffect(() => {
    if (isOpen && product) {
      const analysis = analyzeProductData();
      console.log("🔍 Product Analysis:", analysis);

      setProductType(analysis.productType);
      setProductCurrency(analysis.currency);
      setProductOrigin(analysis.origin);
      setHasGrades(analysis.hasGrades);
      setProductPriceDisplay(analysis.priceDisplay);
      setBaseProductPrice(analysis.priceValue.toString());
      setProductImage(analysis.productImage);

      const grades = getGradesFromProduct();
      setAvailableGrades(grades);

      const qtyOptions = getQuantityOptionsFromProduct();
      setQuantityOptions(qtyOptions);

      const packOptions = getPackingOptionsFromProduct();
      setPackingOptions(packOptions);

      setCurrency(analysis.currency);
      setOrderQuantity(1);

      if (packOptions.length > 0 && !packing) {
        setPacking(packOptions[0].value);
      }

      if (qtyOptions.length > 0 && !quantity) {
        setQuantity(qtyOptions[0].value);
      }

      if (grades.length > 0 && !grade) {
        setGrade(grades[0].value);
      }
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (isOpen && profile && !hasAutoFilled) {
      handleAutoFillFromProfile();
    }
  }, [isOpen, profile]);

  useEffect(() => {
    calculatePrices();
  }, [grade, packing, quantity, cifRequired, currency, baseProductPrice, customQuantity, brandingRequired, transportPrice, orderQuantity]);

  useEffect(() => {
    if (isOpen && product) {
      const analysis = analyzeProductData();

      setGrade("");
      setCifRequired("No");
      setBrandingRequired("No");
      setCustomQuantity("");
      setGradePrice("0.00");
      setPackingPrice("0.00");
      setQuantityPrice("0.00");
      setShippingCost("0.00");
      setInsuranceCost("0.00");
      setTaxes("0.00");
      setBrandingCost("0.00");
      setTransportCost("0.00");
      setTotalPrice("0.00");
      
      // Reset port fields
      setPortOfLoading({ country: "", state: "", portName: "" });
      setPortOfDestination({ country: "", state: "", portName: "" });
      setTransportPrice("0-0");
      
      setSubmitError("");
      setOrderQuantity(1);

      setBaseProductPrice(analysis.priceValue.toString());
      setProductCurrency(analysis.currency);
      setProductOrigin(analysis.origin);
      setHasGrades(analysis.hasGrades);
      setProductPriceDisplay(analysis.priceDisplay);
      setProductImage(analysis.productImage);
      setProductType(analysis.productType);

      const grades = getGradesFromProduct();
      setAvailableGrades(grades);

      const qtyOptions = getQuantityOptionsFromProduct();
      setQuantityOptions(qtyOptions);

      const packOptions = getPackingOptionsFromProduct();
      setPackingOptions(packOptions);

      setCurrency(analysis.currency);

      if (packOptions.length > 0) {
        setPacking(packOptions[0].value);
      }

      if (qtyOptions.length > 0) {
        setQuantity(qtyOptions[0].value);
      }

      if (grades.length > 0) {
        setGrade(grades[0].value);
      }
    }
  }, [isOpen, product]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    console.log("🔄 Starting form submission...");

    const requiredFields = [
      { field: fullName, name: "Full Name" },
      { field: email, name: "Email" },
      { field: cifRequired, name: "CIF Required" },
      { field: brandingRequired, name: "Brand Required" },
      { field: currency, name: "Currency" },
      { field: quantity, name: "Quantity" },
      { field: packing, name: "Packing" }
    ];

    const missingFields = requiredFields.filter(f => !f.field);
    if (missingFields.length > 0) {
      const errorMsg = `Please fill all required fields: ${missingFields.map(f => f.name).join(', ')}`;
      alert(errorMsg);
      setSubmitError(errorMsg);
      return;
    }

    const analysis = analyzeProductData();
    if (analysis.hasGrades && !grade) {
      const errorMsg = "Please select a grade.";
      alert(errorMsg);
      setSubmitError(errorMsg);
      return;
    }

    if (quantity === "custom" && (!customQuantity || parseFloat(customQuantity) <= 0)) {
      const errorMsg = "Please enter a valid custom quantity.";
      alert(errorMsg);
      setSubmitError(errorMsg);
      return;
    }

    const isPhoneValid = validatePhoneNumber(phoneNumber, countryCode);
    const isEmailValid = validateEmail(email);

    if (!isPhoneValid || !isEmailValid) {
      let errorMsg = "";
      if (!isPhoneValid) errorMsg = "Please enter a valid phone number.";
      if (!isEmailValid) errorMsg = "Please enter a valid email address.";
      if (!isPhoneValid && !isEmailValid) errorMsg = "Please enter valid phone number and email address.";
      alert(errorMsg);
      setSubmitError(errorMsg);
      return;
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    const displayPrices = getDisplayPrices();
    const currencySymbol = getCurrencySymbol();

    const selectedQuantityOption = quantityOptions.find(opt => opt.value === quantity);
    let quantityDisplay = "";
    let actualQuantity = 0;
    let actualUnit = "";

    if (quantity === "custom") {
      quantityDisplay = `${customQuantity} ${getQuantityUnit()}`;
      actualQuantity = parseFloat(customQuantity) * orderQuantity;
      actualUnit = getQuantityUnit();
    } else {
      quantityDisplay = selectedQuantityOption ? selectedQuantityOption.label : `${quantity} ${getQuantityUnit()}`;
      actualQuantity = (selectedQuantityOption ? selectedQuantityOption.actualQuantity : parseFloat(quantity)) * orderQuantity;
      actualUnit = selectedQuantityOption ? selectedQuantityOption.actualUnit : getQuantityUnit();
    }

    const quoteData = {
      name: fullName,
      email: email,
      phone: fullPhoneNumber,
      country: country,
      state: state,
      city: city,
      pincode: pincode,

      product: product?.name || "",
      productId: product?.id || "",
      variety: product?.variety || "",
      brand: product?.brand || product?.brandName || "",
      origin: getProductOrigin(),
      grade: grade || "Standard",
      packing: packing,
      quantity: quantityDisplay,
      actualQuantity: actualQuantity,
      actualUnit: actualUnit,
      productImage: productImage,

      cifRequired: cifRequired,
      brandingRequired: brandingRequired,
      currency: currency,
      productCurrency: productCurrency,

      // ============================================
      // 🔥 NEW: Port of Loading and Destination
      // ============================================
      portOfLoading: {
        country: portOfLoading.country,
        state: portOfLoading.state,
        portName: portOfLoading.portName
      },
      portOfDestination: {
        country: portOfDestination.country,
        state: portOfDestination.state,
        portName: portOfDestination.portName
      },
      transportPrice: transportPrice !== "0-0" ? `₹${transportPrice} per ${getUnitType(analysis.productType, product?.name?.toLowerCase() || '')}` : "Not Selected",

      priceBreakdown: {
        note: "This is an estimated bill. Final pricing may vary based on actual costs and market conditions.",
        originalPrice: `Original Price: ${productPriceDisplay}`,
        ...(portOfLoading.portName && {
          portOfLoadingLine: `Port of Loading: ${portOfLoading.portName}, ${portOfLoading.state}, ${portOfLoading.country}`
        }),
        ...(portOfDestination.portName && {
          portOfDestinationLine: `Port of Destination: ${portOfDestination.portName}, ${portOfDestination.state}, ${portOfDestination.country}`
        }),
        ...(transportPrice !== "0-0" && {
          transportPriceLine: `Transport Price: ₹${transportPrice} per ${getUnitType(analysis.productType, product?.name?.toLowerCase() || '')}`
        }),
        ...(grade && {
          gradeLine: `Grade: ${grade}`
        }),
        packingLine: `Packing: ${packing}`,
        quantityLine: `Quantity: ${quantityDisplay}`,
        quantityPriceLine: `Quantity Price: ${displayPrices.quantityPrice}`,
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
      displayValues: {
        originalPrice: productPriceDisplay,
        grade: grade || "Not Selected",
        packing: packing,
        quantity: quantityDisplay,
        brandingCost: displayPrices.brandingCost,
        transportCost: displayPrices.transportCost,
        shippingCost: displayPrices.shippingCost,
        insuranceCost: displayPrices.insuranceCost,
        taxes: displayPrices.taxes,
        finalTotal: displayPrices.finalTotalPrice
      },
      additionalInfo: additionalInfo || "",
      userId: profile?.uid || "guest",
      userEmail: profile?.email || email,
      timestamp: Date.now(),
      date: new Date().toISOString(),
      readableDate: new Date().toLocaleString(),
      productType: analysis.productType,
      status: "new",
      source: "website",
      isNew: true,
      hasAutoFilled: hasAutoFilled,
      profileUsed: !!profile,
      orderQuantity: orderQuantity
    };

    console.log("📝 Quote Data Prepared:", quoteData);

    setIsSubmitting(true);
    try {
      console.log("📤 Submitting to Firebase...");
      const quoteId = await submitQuote(quoteData);
      console.log('✅ Quote submitted successfully with ID:', quoteId);

      const message = `Hello! I want a quote for:
- Name: ${fullName}
- Email: ${email}
- Phone: ${fullPhoneNumber}
- Country: ${country}
- State: ${state}
- City: ${city}
- Pincode: ${pincode}
- Product: ${product?.name || ""}
- Origin: ${getProductOrigin()}
- Variety: ${product?.variety || ""}
- Brand: ${product?.brand || product?.brandName || ""}
${grade ? `- Grade: ${grade}` : ""}
- Packing: ${packing}
- Quantity: ${quantityDisplay}
- Order Quantity Multiplier: ${orderQuantity}
- CIF Required: ${cifRequired}
- Brand Required: ${brandingRequired}
- Product Currency: ${productCurrency}
- Selected Currency: ${currency}
- Port of Loading: ${portOfLoading.portName ? `${portOfLoading.portName}, ${portOfLoading.state}, ${portOfLoading.country}` : "Not specified"}
- Port of Destination: ${portOfDestination.portName ? `${portOfDestination.portName}, ${portOfDestination.state}, ${portOfDestination.country}` : "Not specified"}
${transportPrice !== "0-0" ? `- Transport Price: ₹${transportPrice} per ${getUnitType(analysis.productType, product?.name?.toLowerCase() || '')}` : ""}
- Estimated Bill:
  • Original Price: ${productPriceDisplay}
  ${grade ? `• Grade: ${grade}` : ""}
  • Packing: ${packing}
  • Quantity: ${quantityDisplay}
  • Quantity Price: ${displayPrices.quantityPrice}
  ${brandingRequired === "Yes" ? `• Branding/Custom Printing: ${displayPrices.brandingCost}` : ""}
  ${transportPrice !== "0-0" ? `• Transport Cost: ${displayPrices.transportCost}` : ""}
  ${cifRequired === "Yes" ? `• Shipping Cost: ${displayPrices.shippingCost}` : ""}
  ${cifRequired === "Yes" ? `• Insurance Cost: ${displayPrices.insuranceCost}` : ""}
  ${cifRequired === "Yes" ? `• Taxes & Duties: ${displayPrices.taxes}` : ""}
  • Final Total: ${displayPrices.finalTotalPrice}
${additionalInfo ? `- Additional Info: ${additionalInfo}` : ""}
Thank you!`;

      console.log("📱 WhatsApp Message Created");
      window.open(
  `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
  "_blank"
);

      const successMsg = `✅ Order #${quoteId.substring(0, 8)} submitted successfully! Check "My Orders" for details.`;
      alert(successMsg);
      console.log(successMsg);

      if (onOrderSubmitted) {
        onOrderSubmitted(quoteId);
      }

      setShowThankYou(true);
      resetForm();
    } catch (err) {
      console.error("❌ Error submitting form:", err);
      const errorMsg = err.message || "Something went wrong while submitting your quote. Please try again.";
      alert(errorMsg);
      setSubmitError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setGrade("");
    setPacking("");
    setQuantity("");
    setCifRequired("No");
    setCurrency("USD");
    setBrandingRequired("No");
    setAdditionalInfo("");
    setCustomQuantity("");
    setGradePrice("0.00");
    setPackingPrice("0.00");
    setQuantityPrice("0.00");
    setShippingCost("0.00");
    setInsuranceCost("0.00");
    setTaxes("0.00");
    setBrandingCost("0.00");
    setTransportCost("0.00");
    setTotalPrice("0.00");
    
    // Reset port fields
    setPortOfLoading({ country: "", state: "", portName: "" });
    setPortOfDestination({ country: "", state: "", portName: "" });
    setTransportPrice("0-0");
    
    setProductCurrency("USD");
    setProductOrigin("");
    setAvailableGrades([]);
    setHasGrades(false);
    setProductPriceDisplay("");
    setQuantityOptions([]);
    setPackingOptions([]);
    setHasAutoFilled(false);
    setSubmitError("");
    setProductImage("");
    setOrderQuantity(1);
    setProductType('default');

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
  };

  const handleClose = () => {
    resetForm();
    setShowThankYou(false);
    onClose();
  };

  const getSelectedQuantityDisplay = () => {
    if (quantity === "custom") {
      return `${customQuantity || 0} ${getQuantityUnit()}`;
    } else {
      const selectedOption = quantityOptions.find(q => q.value === quantity);
      return selectedOption ? selectedOption.label : "Not selected";
    }
  };

  if (!isOpen) return null;

  const analysis = analyzeProductData();
  const currencySymbol = getCurrencySymbol();
  const productCurrencySymbol = getProductCurrencySymbol();
  const displayPrices = getDisplayPrices();
  const unitType = getUnitType(productType, product?.name?.toLowerCase() || '');

  return (
    <>
      <div className="buy-modal-overlay single-product">
        <div className="buy-modal-container" ref={modalRef}>
          <button className="buy-modal-close-btn" onClick={handleClose} aria-label="Close modal">
            &times;
          </button>

          <div className="buy-modal-header">
            <h2 className="buy-modal-title">
              Get Quote
            </h2>
            <p className="buy-modal-subtitle">
              Fill out the form below and we'll get back to you shortly
            </p>

            <div className="product-type-info">
              <small>📦 {productType?.charAt(0).toUpperCase() + productType?.slice(1)}</small>
              {product?.companyName && <small>🏢 {product.companyName}</small>}
              {product?.brandName && product.brandName !== 'General' && <small>🏷️ {product.brandName}</small>}
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
                        Click to auto-fill your information from your profile. You can still edit any field.
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
                      Product Details
                    </h3>

                    <div className="standard-product-display">
                      <div className="standard-product-item single">
                        <div className="standard-product-image">
                          <div className="order-quantity-buttons">
                            <button
                              type="button"
                              className="order-quantity-btn"
                              onClick={handleDecreaseOrderQuantity}
                              aria-label="Decrease order quantity"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="order-quantity-display">{orderQuantity}</span>
                            <button
                              type="button"
                              className="order-quantity-btn"
                              onClick={handleIncreaseOrderQuantity}
                              aria-label="Increase order quantity"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <img
                            src={productImage}
                            alt={product?.name}
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&auto=format&fit=crop&q=60';
                            }}
                          />
                          <div className="product-badge">
                            {product?.companyName === 'Nut Walker' ? '🥜 Dry Fruits' :
                              product?.companyName === 'Heritage' ? '🌾 Heritage' :
                                product?.companyName === 'Akil Drinks' ? '🥤 Beverages' :
                                  product?.companyName === 'SIEA' ? '🍚 Rice' : '⭐ Premium'}
                          </div>
                        </div>

                        <div className="standard-product-details">
                          <div className="standard-product-header">
                            <h4 className="standard-product-name">{product?.name}</h4>
                            <span className="standard-product-brand">{product?.companyName || 'Brand'}</span>
                            {product?.brandName && product.brandName !== 'General' && (
                              <span className="standard-product-sub-brand">{product.brandName}</span>
                            )}
                          </div>

                          <div className="standard-product-price-section">
                            <div className="standard-price-display">
                              <span className="standard-price-amount">{productPriceDisplay}</span>
                              <span className="standard-price-unit">each</span>
                            </div>
                            {quantity && quantity !== "custom" && (
                              <div className="standard-total-price">
                                <span className="total-label">Total ({orderQuantity} × {getSelectedQuantityDisplay()}):</span>
                                <span className="total-amount">{displayPrices.quantityPrice}</span>
                              </div>
                            )}
                          </div>

                          <div className="standard-product-config single">
                            {hasGrades && availableGrades.length > 0 && (
                              <div className="config-row">
                                <span className="config-label">Grade:</span>
                                <select value={grade} onChange={handleGradeChange} required className="config-select-small">
                                  <option value="">Select Grade</option>
                                  {availableGrades.map((gradeOption, index) => (
                                    <option key={index} value={gradeOption.value}>
                                      {gradeOption.value} {gradeOption.price ? `(${productCurrencySymbol}${gradeOption.price}/kg)` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="config-row">
                              <span className="config-label">Packing:</span>
                              <select value={packing} onChange={handlePackingChange} required className="config-select-small">
                                <option value="">Select Packing</option>
                                {packingOptions.map((packingOption, index) => (
                                  <option key={index} value={packingOption.value}>
                                    {packingOption.value} {packingOption.price ? `(${currencySymbol}${packingOption.price})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="config-row">
                              <span className="config-label">Quantity:</span>
                              <div className="quantity-select-group">
                                <select value={quantity} onChange={handleQuantityChange} required className="config-select-small">
                                  <option value="">Select Quantity</option>
                                  {quantityOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                {quantity === "custom" && (
                                  <input
                                    type="number"
                                    placeholder={`Enter custom quantity in ${getQuantityUnit()}`}
                                    value={customQuantity}
                                    onChange={handleCustomQuantityChange}
                                    className="custom-quantity-input"
                                    min="1"
                                    step="1"
                                    required
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="standard-product-meta">
                            {product?.origin && (
                              <div className="meta-item">
                                <span className="meta-label">Origin:</span>
                                <span className="meta-value">{product.origin}</span>
                              </div>
                            )}
                            {product?.variety && (
                              <div className="meta-item">
                                <span className="meta-label">Variety:</span>
                                <span className="meta-value">{product.variety}</span>
                              </div>
                            )}
                            {getSelectedQuantityDisplay() && (
                              <div className="meta-item">
                                <span className="meta-label">Selected Qty:</span>
                                <span className="meta-value">{getSelectedQuantityDisplay()}</span>
                              </div>
                            )}
                            <div className="meta-item">
                              <span className="meta-label">Order Qty:</span>
                              <span className="meta-value">{orderQuantity} units</span>
                            </div>
                          </div>
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
                          <small>Auto-filled from profile</small>
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
                          <small>Auto-filled from profile</small>
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
                          <small>Auto-filled from profile</small>
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
                          <small>Auto-filled from profile</small>
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
                          <small>Auto-filled from profile</small>
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
                          <small>Auto-filled from profile</small>
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
                          <small>Auto-filled from profile</small>
                        </div>
                      )}
                      {phoneError && <div className="error-message">{phoneError}</div>}
                    </div>
                  </section>

                  <section className="form-section">
                    <h3 className="section-title">Order Requirements</h3>

                    {/* ============================================ */}
                    {/* 🔥 NEW: Port of Loading Section */}
                    {/* ============================================ */}
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

                    {/* ============================================ */}
                    {/* 🔥 NEW: Port of Destination Section */}
                    {/* ============================================ */}
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
                            <small>Transport Price: ₹{transportPrice} per {unitType}</small>
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
                        <small>CIF (Cost, Insurance, and Freight) includes shipping and insurance costs to your destination port</small>
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
                        `Order Now (${orderQuantity})`
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
                    Estimated Bill Breakdown
                  </h4>

                  <div className="estimate-note">
                    <small>This is an estimated bill. Final pricing may vary based on actual costs and market conditions.</small>
                    {transportPrice !== "0-0" && (
                      <div className="transport-price-display">
                        <small>Transport Price: ₹{transportPrice} per {unitType}</small>
                      </div>
                    )}
                  </div>

                  <div className="price-breakdown-grid">
                    {/* 🔥 NEW: Show Port Information in Summary */}
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

                    {hasGrades && grade && (
                      <div className="price-item">
                        <span className="price-label">Selected Grade:</span>
                        <span className="price-value">{grade}</span>
                      </div>
                    )}

                    <div className="price-item">
                      <span className="price-label">Packing:</span>
                      <span className="price-value">{packing || "Not Selected"}</span>
                    </div>

                    <div className="price-item">
                      <span className="price-label">Quantity:</span>
                      <span className="price-value">
                        {quantity === "custom"
                          ? `${customQuantity} ${getQuantityUnit()}`
                          : quantityOptions.find(q => q.value === quantity)?.label || "Not Selected"
                        }
                      </span>
                    </div>

                    <div className="price-item">
                      <span className="price-label">Order Quantity:</span>
                      <span className="price-value">{orderQuantity} units</span>
                    </div>

                    <div className="price-item">
                      <span className="price-label">Quantity Price:</span>
                      <span className="price-value">{displayPrices.quantityPrice}</span>
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
    </>
  );
};

export default SingleProductBuyModal;
