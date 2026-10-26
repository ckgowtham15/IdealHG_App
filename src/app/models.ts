export type Kind = 'action' | 'decision' | 'check' | 'inform';
export interface Step { id: string; title: string; kind: Kind; backTo?: string; noText?: string; }
export interface LogEntry { stepId: string; start: number; end?: number; outcome?: 'yes' | 'no'; remark?: string; by?: string; }
export interface Order { id: string; customer: string; project: string; product: string; created: number; idx: number; log: LogEntry[]; closed?: number; }

// The SOP from the flowchart. "No" on a decision sends the order back to `backTo`.
export const STEPS: Step[] = [
  { id: 's1', kind: 'action', title: 'Initial client visit: introduce Hörmann products (Residential, Commercial & Industrial) and give the catalogue' },
  { id: 'd1', kind: 'decision', title: 'Customer interested / asks for a quote?', backTo: 'd1', noText: 'Log reason (price, delivery time, specs, design, competitor, postponed, budget, no longer required) and follow up' },
  { id: 'c1', kind: 'check', title: 'CHECK: verify dimensions at site before the BOQ is prepared' },
  { id: 's2', kind: 'action', title: 'Receive enquiry / BOQ: customer details, project name, product type, dimensions, handing, finish / RAL colour, quantity' },
  { id: 's3', kind: 'action', title: 'Create Lead in Kylas (Channel Partner, Coimbatore) and mail enquiry sheet to Hörmann for quotation' },
  { id: 's4', kind: 'action', title: 'Receive quotation from Hörmann: check details, set profit %, create bill in Swipe' },
  { id: 'd5', kind: 'decision', title: 'Quotation details correct?', backTo: 's4', noText: 'Query Hörmann for a corrected quotation' },
  { id: 's5', kind: 'action', title: 'Send quotation to customer and collect feedback on price, quantity etc.' },
  { id: 'd6', kind: 'decision', title: 'Customer accepts the quotation?', backTo: 's5', noText: 'Rectify: price high → negotiate; timing → confirm delivery date; dimension → re-check and revise' },
  { id: 's7', kind: 'action', title: 'Receive customer PO: check names, PO no./date, GST & billing address, quotation no., terms, handing, RAL. Create our PO to Hörmann' },
  { id: 'd8', kind: 'decision', title: 'PO details match the quotation?', backTo: 's7', noText: 'Ask customer to correct / re-issue the PO' },
  { id: 's8', kind: 'action', title: "Upload client PO and our PO in Kylas ('Purchase order received')" },
  { id: 'c2', kind: 'check', title: 'CHECK: confirm final dimensions before the Sale Order' },
  { id: 'i2', kind: 'inform', title: 'INFORM the installation team (before Sale Order)' },
  { id: 's9', kind: 'action', title: 'Pay advance (50% or 75%), keep proof, enter PO – EFT / CCA in Kylas' },
  { id: 's10', kind: 'action', title: 'Upload payment documents (project, customer ID, quotation no., UTR, date, PO no., amount) and submit for CCA approval' },
  { id: 'd12', kind: 'decision', title: 'CCA approved?', backTo: 's10', noText: 'Correct documents / payment details and resubmit' },
  { id: 's11', kind: 'action', title: 'Sale Order issued: check, seal & sign, upload in Kylas. Get revised quotation if the quotation date expired' },
  { id: 's13', kind: 'action', title: 'Check and release order for production; upload signed documents' },
  { id: 's14', kind: 'action', title: 'Follow up production and dispatch readiness with Hörmann' },
  { id: 's15', kind: 'action', title: 'Pay remaining amount before dispatch; upload proof for CCA approval' },
  { id: 's16', kind: 'action', title: 'Obtain final clearance / delivery approval' },
  { id: 'c3', kind: 'check', title: 'CHECK: verify dimensions before dispatch' },
  { id: 'i3', kind: 'inform', title: 'INFORM the installation team (before dispatch)' },
  { id: 's17', kind: 'action', title: 'Dispatch and delivery: track transport, update customer, retain delivery documents' },
  { id: 'c4', kind: 'check', title: 'CHECK: after delivery, verify materials and dimensions' },
  { id: 'd14', kind: 'decision', title: 'Materials & dimensions OK?', backTo: 's17', noText: 'Report damage / mismatch to Hörmann; arrange replacement or correction' },
  { id: 'i4', kind: 'inform', title: 'INFORM the installation team (after material received)' },
  { id: 's18', kind: 'action', title: 'Installation at site' },
  { id: 's19', kind: 'action', title: 'Ask client for a review and take photos of the finished work – closes the order' },
];
