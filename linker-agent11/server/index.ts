import 'dotenv/config';
import { createServerApp } from './app';

export { createServerApp };

export const app = createServerApp();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Market Intelligence Agent Server running on port ${PORT}`);
});
