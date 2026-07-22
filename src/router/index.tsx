import { createBrowserRouter, redirect } from 'react-router-dom'
import { AuthInitProvider } from '@/features/auth/components/auth-init-provider'
import { MainLayout } from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/layout/protected-route'
import { LoginPage } from '@/features/auth/pages/login-page'
import DashboardPage from '@/features/dashboard/pages/dashboard-page'
import InventoryPage from '@/features/inventory/pages/inventory-page'
import POSPage from '@/features/sales/pages/pos-page'
import SalesHistoryPage from '@/features/sales/pages/sales-history-page'
import QuotesPage from '@/features/quotes/pages/quotes-page'
import CashRegisterPage from '@/features/cash-register/pages/cash-register-page'
import ExpensesPage from '@/features/expenses/pages/expenses-page'
import ReinvestmentsPage from '@/features/reinvestments/pages/reinvestments-page'
import MonthlyClosuresPage from '@/features/monthly-closures/pages/monthly-closures-page'
import ReportsPage from '@/features/reports/pages/reports-page'
import UsersPage from '@/features/users/pages/users-page'
import SettingsPage from '@/features/settings/pages/settings-page'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthInitProvider>
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </AuthInitProvider>
    ),
    children: [
      {
        index: true,
        loader: () => redirect('/dashboard'),
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'inventory',
        element: <InventoryPage />,
      },
      {
        path: 'pos',
        element: <POSPage />,
      },
      {
        path: 'sales',
        element: <SalesHistoryPage />,
      },
      {
        path: 'quotes',
        element: <QuotesPage />,
      },
      {
        path: 'cash-register',
        element: <CashRegisterPage />,
      },
      {
        path: 'expenses',
        element: <ExpensesPage />,
      },
      {
        path: 'reinvestments',
        element: <ReinvestmentsPage />,
      },
      {
        path: 'closures',
        element: <MonthlyClosuresPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    loader: () => redirect('/dashboard'),
  },
])