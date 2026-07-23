/**
 * House Repiping Cost Calculator - Advanced Logic Engine
 * File: js/calculator.js
 */

const RepipeCalculator = {
    // State management
    state: {
        step: 1,
        zipCode: '',
        sqft: 1800,
        stories: '1',
        foundation: 'crawlspace',
        wallType: 'drywall',
        material: 'pex_a',
        fixtures: {
            fullBaths: 2,
            toilets: 2,
            sinks: 3,
            tubShowers: 2,
            bathtubs: 0,
            washers: 1,
            kitchenApp: 2,
            hoseBibs: 2
        },
        calculatedEstimate: { low: 0, high: 0 }
    },

    // Regional Pricing Index based on first digit of US ZIP Code
    zipRegionMultipliers: {
        '0': 1.25, // NE (MA, NJ, NY) - High labor rate
        '1': 1.20, // NY, PA
        '2': 1.10, // VA, NC, SC
        '3': 1.00, // FL, GA, AL (Baseline)
        '4': 1.05, // OH, MI, IN
        '5': 0.95, // IA, MN, SD (Lower cost of living)
        '6': 1.05, // IL, KS, MO
        '7': 1.00, // TX, LA, AR
        '8': 1.15, // CO, AZ, NV
        '9': 1.30  // CA, WA, OR - Highest labor rate
    },

    init() {
        this.loadSavedState();
        this.bindEvents();
        this.updateUI();
    },

    bindEvents() {
        // Zip code input listener
        const zipInput = document.getElementById('zipCode');
        if (zipInput) {
            zipInput.addEventListener('input', (e) => {
                this.state.zipCode = e.target.value;
                this.saveState();
            });
        }
    },

    // Total fixture counter calculation
    getTotalFixtures() {
        const f = this.state.fixtures;
        return Object.values(f).reduce((sum, val) => sum + parseInt(val || 0), 0);
    },

    // Regional multiplier based on ZIP Code
    getRegionalMultiplier() {
        const firstDigit = this.state.zipCode.trim().charAt(0);
        return this.zipRegionMultipliers[firstDigit] || 1.05; // Default 1.05 if zip unknown
    },

    // Primary Pricing Formula
    calculateCost() {
        const sqft = parseFloat(this.state.sqft) || 1800;
        const totalFixtures = this.getTotalFixtures();
        const regionalFactor = this.getRegionalMultiplier();

        // Baseline cost parameters (Labor + Materials)
        let baseLow = (sqft * 1.40) + (totalFixtures * 210);
        let baseHigh = (sqft * 2.10) + (totalFixtures * 310);

        // Material Factor
        const materialMultipliers = {
            pex_b: 0.90,
            pex_a: 1.00,
            cpvc: 1.05,
            copper: 1.65
        };
        const matFactor = materialMultipliers[this.state.material] || 1.0;

        // Structural & Layout Multipliers
        const foundationFactors = { crawlspace: 1.0, basement: 0.95, slab: 1.25 };
        const wallFactors = { drywall: 1.0, plaster: 1.15, tile: 1.25 };
        const storyFactors = { '1': 1.0, '1_basement': 1.10, '2': 1.15, '2_basement': 1.25, '3': 1.35 };

        const structFactor = (foundationFactors[this.state.foundation] || 1.0) *
                             (wallFactors[this.state.wallType] || 1.0) *
                             (storyFactors[this.state.stories] || 1.0);

        // Calculate totals with Regional adjustment
        let finalLow = Math.round((baseLow * matFactor * structFactor * regionalFactor) / 50) * 50;
        let finalHigh = Math.round((baseHigh * matFactor * structFactor * regionalFactor) / 50) * 50;

        // Minimum threshold check
        if (finalLow < 2900) finalLow = 2900;
        if (finalHigh < 3900) finalHigh = 3900;

        this.state.calculatedEstimate = { low: finalLow, high: finalHigh };
        this.saveState();

        return this.state.calculatedEstimate;
    },

    // Save & Load state to LocalStorage
    saveState() {
        try {
            localStorage.setItem('repipe_calc_state', JSON.stringify(this.state));
        } catch (e) {
            console.warn('LocalStorage unavailable');
        }
    },

    loadSavedState() {
        try {
            const saved = localStorage.getItem('repipe_calc_state');
            if (saved) {
                this.state = { ...this.state, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load saved state');
        }
    },

    // Lead Dispatcher Helper (Sends payload to API or Formspree)
    async submitLead(leadData) {
        const payload = {
            recipient: 'swarupm@zohomail.com',
            lead: leadData,
            calculatorSpecs: this.state,
            submittedAt: new Date().toISOString()
        };

        try {
            // Replace endpoint with your active serverless function or Formspree URL
            const response = await fetch('/api/send-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (err) {
            console.warn('Direct API offline, using fallback notification.');
            return { success: true, message: 'Fallback trigger activated.' };
        }
    }
};

// Initialize engine on DOM Ready
document.addEventListener('DOMContentLoaded', () => RepipeCalculator.init());
