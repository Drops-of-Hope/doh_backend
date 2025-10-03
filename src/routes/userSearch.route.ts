import { Router } from 'express';
import { UserSearchController } from '../controllers/userSearch.controller.js';
import { authenticateToken } from '../middlewares/authenticateUser.js';

const router = Router();

// GET /users/search - Search for users/donors with filters
router.get('/search', authenticateToken, UserSearchController.searchUsers);

// GET /users/:donorId - Get detailed information about a specific donor
router.get('/:donorId', authenticateToken, UserSearchController.getDonorDetails);

// POST /users/:donorId/verify - Verify donor identity and eligibility
router.post('/:donorId/verify', authenticateToken, UserSearchController.verifyDonor);

// GET /users/recent - Get recently active donors
router.get('/recent', authenticateToken, UserSearchController.getRecentDonors);

// GET /users/frequent - Get frequently donating users
router.get('/frequent', authenticateToken, UserSearchController.getFrequentDonors);

export default router;