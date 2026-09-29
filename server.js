import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ success:false, error:'Min ₹1' });
    const order = await razorpay.orders.create({ amount: Math.round(amount), currency, receipt: receipt || `hf_${Date.now()}` });
    res.json({ success:true, order_id:order.id, amount:order.amount, currency:order.currency });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, error:'Failed' });
  }
});

app.post('/api/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return res.status(400).json({ success:false, error:'Missing fields' });

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (expected === razorpay_signature) return res.json({ success:true });
  res.status(400).json({ success:false, error:'Signature mismatch' });
});

app.listen(process.env.PORT || 3000, () => console.log(`✅ http://localhost:${process.env.PORT || 3000}`));
