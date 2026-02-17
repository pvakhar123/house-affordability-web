export interface Document {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
}

export const KNOWLEDGE_BASE: Document[] = [
  {
    id: "fha-basics",
    title: "FHA Loan Basics",
    content:
      "FHA loans are mortgages insured by the Federal Housing Administration. They allow down payments as low as 3.5% with a credit score of 580 or higher. Borrowers with scores between 500-579 can still qualify but need 10% down. FHA loans are popular with first-time homebuyers because of their lenient qualification requirements.",
    source: "HUD.gov — FHA Loan Requirements",
    category: "loan-types",
  },
  {
    id: "fha-limits",
    title: "FHA Loan Limits and MIP",
    content:
      "FHA loan limits vary by county. In 2024, the floor is $498,257 and the ceiling is $1,149,825 for high-cost areas. FHA loans require Mortgage Insurance Premium (MIP): an upfront premium of 1.75% of the loan amount plus annual MIP of 0.55% for most borrowers. Unlike PMI on conventional loans, FHA MIP typically lasts the life of the loan unless you put 10% or more down.",
    source: "HUD.gov — FHA Mortgage Limits",
    category: "loan-types",
  },
  {
    id: "conventional-basics",
    title: "Conventional Loan Basics",
    content:
      "Conventional loans are not backed by a government agency. They typically require a minimum credit score of 620 and a down payment of at least 3% (5% for investment properties). If you put less than 20% down, you'll pay Private Mortgage Insurance (PMI), which typically costs 0.5% to 1.5% of the loan amount annually. PMI automatically cancels when equity reaches 22%.",
    source: "Fannie Mae — Conventional Loan Guidelines",
    category: "loan-types",
  },
  {
    id: "conventional-limits",
    title: "Conventional Conforming Loan Limits",
    content:
      "Conforming loan limits for 2024 are $766,550 for most areas and up to $1,149,825 for high-cost areas. Loans above these limits are called 'jumbo loans' and have stricter requirements: typically 700+ credit score, 10-20% down payment, and lower DTI ratios. Jumbo loan rates may be slightly higher than conforming rates.",
    source: "FHFA — Conforming Loan Limits",
    category: "loan-types",
  },
  {
    id: "va-basics",
    title: "VA Loan Benefits",
    content:
      "VA loans are available to eligible veterans, active-duty service members, and surviving spouses. Key benefits: no down payment required, no PMI, competitive interest rates (typically 0.25-0.5% lower than conventional), and no prepayment penalties. VA loans do have a funding fee of 1.25% to 3.3% of the loan amount, which can be rolled into the loan.",
    source: "VA.gov — VA Home Loan Program",
    category: "loan-types",
  },
  {
    id: "dti-explained",
    title: "Debt-to-Income Ratio Explained",
    content:
      "Debt-to-Income (DTI) ratio is your total monthly debt payments divided by gross monthly income. There are two types: Front-end DTI (housing costs only, ideally under 28%) and Back-end DTI (all debts including housing, ideally under 36%). Most lenders allow up to 43% back-end DTI for qualified mortgages. FHA allows up to 50% with compensating factors. Lower DTI means lower risk and potentially better rates.",
    source: "CFPB — Debt-to-Income Ratio",
    category: "financial-concepts",
  },
  {
    id: "down-payment-strategies",
    title: "Down Payment Strategies",
    content:
      "Common down payment amounts: 3% (minimum for conventional), 3.5% (FHA), 5% (preferred conventional), 10% (reduces PMI), 20% (eliminates PMI). Down payment assistance programs exist in every state — check your state's housing finance agency. Gift funds from family are allowed for most loan types but require a gift letter. Some employers offer homebuying assistance programs.",
    source: "NerdWallet — Down Payment Guide",
    category: "financial-concepts",
  },
  {
    id: "closing-costs",
    title: "Understanding Closing Costs",
    content:
      "Closing costs typically range from 2% to 5% of the home's purchase price. They include: origination fees (0.5-1%), appraisal ($300-$600), title insurance ($500-$3,500), attorney fees, recording fees, prepaid property taxes and homeowner's insurance. You can negotiate seller concessions (seller pays part of your closing costs) — FHA allows up to 6%, conventional up to 3% with less than 10% down.",
    source: "Bankrate — Closing Cost Guide",
    category: "financial-concepts",
  },
  {
    id: "credit-score-impact",
    title: "How Credit Score Affects Your Mortgage",
    content:
      "Your credit score directly impacts your mortgage rate. Approximate rate differences (2024): 760+ gets the best rate, 700-759 adds ~0.25%, 680-699 adds ~0.5%, 660-679 adds ~0.75%, 620-659 adds ~1% or more. A 1% rate difference on a $400,000 loan equals about $240/month or $86,000 over 30 years. To improve your score: pay bills on time, reduce credit utilization below 30%, don't open new accounts before applying.",
    source: "MyFICO — Mortgage Rate Comparison",
    category: "financial-concepts",
  },
  {
    id: "property-tax",
    title: "Property Tax Overview",
    content:
      "Property taxes vary significantly by location. National average is about 1.1% of assessed value. Highest states: New Jersey (2.23%), Illinois (2.08%), New Hampshire (1.93%). Lowest states: Hawaii (0.29%), Alabama (0.41%), Colorado (0.51%). Property taxes can increase annually based on reassessments. Some states offer homestead exemptions that reduce taxable value for primary residences.",
    source: "Tax Foundation — Property Tax by State",
    category: "costs",
  },
  {
    id: "pmi-details",
    title: "Private Mortgage Insurance (PMI)",
    content:
      "PMI is required on conventional loans with less than 20% down payment. Monthly PMI costs range from $30-$150 per $100,000 borrowed depending on credit score and down payment. PMI can be cancelled when you reach 20% equity (you must request it) and automatically drops off at 22% equity. Strategies to avoid PMI: put 20% down, use a piggyback loan (80/10/10), choose a lender-paid PMI option (higher rate, no separate PMI payment).",
    source: "CFPB — PMI Guide",
    category: "costs",
  },
  {
    id: "arm-vs-fixed",
    title: "ARM vs Fixed Rate Mortgages",
    content:
      "Fixed-rate mortgages lock your rate for the entire loan term (15, 20, or 30 years). Adjustable-rate mortgages (ARMs) have a lower initial rate that adjusts after a fixed period. A 5/1 ARM is fixed for 5 years then adjusts annually. A 7/1 ARM is fixed for 7 years. ARMs typically start 0.5-1% lower than fixed rates. ARMs make sense if you plan to sell or refinance within the fixed period. Risk: rates could increase significantly after the fixed period.",
    source: "Freddie Mac — ARM vs Fixed",
    category: "loan-types",
  },
  {
    id: "home-inspection",
    title: "Home Inspection Basics",
    content:
      "A home inspection costs $300-$500 and covers: structural integrity, roof condition, plumbing, electrical, HVAC, foundation, and potential safety issues. It's not required by lenders but strongly recommended. The inspection report can be used to negotiate repairs or price reductions with the seller. Additional specialized inspections to consider: radon ($150), termite ($75-$150), sewer line ($150-$300), and mold ($300-$600).",
    source: "ASHI — Home Inspection Guide",
    category: "buying-process",
  },
  {
    id: "first-time-buyer-programs",
    title: "First-Time Homebuyer Programs",
    content:
      "First-time buyers (anyone who hasn't owned a home in 3 years) have access to special programs: FHA loans (3.5% down), Fannie Mae HomeReady (3% down, income limits), Freddie Mac Home Possible (3% down, income limits), state-specific down payment assistance (grants or low-interest loans), and federal tax credits in some areas. Many programs can be combined. Check with a HUD-approved housing counselor for free guidance.",
    source: "HUD.gov — First-Time Buyer Resources",
    category: "buying-process",
  },
];
