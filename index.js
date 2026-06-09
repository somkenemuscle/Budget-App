const STORAGE_KEY = 'clearbudget-data';

const CATEGORY_COLORS = {
    Food: '#22c55e',
    Transport: '#f59e0b',
    Housing: '#6366f1',
    Entertainment: '#ec4899',
    Shopping: '#a855f7',
    Other: '#8b8b9e',
};

const defaultState = () => ({
    budget: 0,
    expenses: [],
});

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? { ...defaultState(), ...JSON.parse(saved) } : defaultState();
    } catch {
        return defaultState();
    }
}

let state = loadState();

function setState(updates) {
    state = { ...state, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
}

function formatMoney(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}

function getTotalSpent() {
    return state.expenses.reduce((sum, e) => sum + e.amount, 0);
}

function getRemaining() {
    return state.budget - getTotalSpent();
}

function getCategoryTotals() {
    return state.expenses.reduce((totals, expense) => {
        totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
        return totals;
    }, {});
}

function addExpense(description, amount, category) {
    const expense = {
        id: crypto.randomUUID(),
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        date: new Date().toISOString(),
    };

    setState({ expenses: [expense, ...state.expenses] });
}

function deleteExpense(id) {
    setState({ expenses: state.expenses.filter((e) => e.id !== id) });
}

function setBudget(amount) {
    setState({ budget: parseFloat(amount) || 0 });
}

function renderSummary() {
    const spent = getTotalSpent();
    const remaining = getRemaining();
    const percent = state.budget > 0 ? Math.min((spent / state.budget) * 100, 100) : 0;
    const overBudget = remaining < 0;

    document.getElementById('summary').innerHTML = `
        <div class="summary-card">
            <p class="summary-card__label">Budget</p>
            <p class="summary-card__value">${formatMoney(state.budget)}</p>
        </div>
        <div class="summary-card">
            <p class="summary-card__label">Spent</p>
            <p class="summary-card__value">${formatMoney(spent)}</p>
        </div>
        <div class="summary-card">
            <p class="summary-card__label">Remaining</p>
            <p class="summary-card__value ${overBudget ? 'negative' : 'positive'}">
                ${formatMoney(remaining)}
            </p>
        </div>
        <div class="progress-wrap">
            <div class="progress-header">
                <span>Budget used</span>
                <span>${state.budget > 0 ? Math.round((spent / state.budget) * 100) : 0}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar__fill ${overBudget ? 'over' : ''}" style="width: ${percent}%"></div>
            </div>
        </div>
    `;
}

function renderCategories() {
    const totals = getCategoryTotals();
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const container = document.getElementById('categories');

    if (entries.length === 0) {
        container.innerHTML = '<p class="categories-empty">Spending by category will show here.</p>';
        return;
    }

    container.innerHTML = entries
        .map(
            ([name, amount]) => `
            <div class="category-item">
                <span class="category-dot" style="background: ${CATEGORY_COLORS[name] || CATEGORY_COLORS.Other}"></span>
                <span class="category-item__name">${name}</span>
                <span class="category-item__amount">${formatMoney(amount)}</span>
            </div>
        `
        )
        .join('');
}

function renderExpenses() {
    const list = document.getElementById('expenseList');
    const count = document.getElementById('expenseCount');

    count.textContent = `${state.expenses.length} item${state.expenses.length !== 1 ? 's' : ''}`;

    list.innerHTML = state.expenses
        .map((expense) => {
            const date = new Date(expense.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });

            return `
                <li class="expense-item" data-id="${expense.id}">
                    <div class="expense-item__info">
                        <p class="expense-item__desc">${escapeHtml(expense.description)}</p>
                        <p class="expense-item__meta">${expense.category} · ${date}</p>
                    </div>
                    <span class="expense-item__amount">-${formatMoney(expense.amount)}</span>
                    <button class="btn btn--danger" data-delete="${expense.id}" aria-label="Delete expense">Delete</button>
                </li>
            `;
        })
        .join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function render() {
    renderSummary();
    renderCategories();
    renderExpenses();

    const budgetInput = document.getElementById('budgetAmount');
    if (document.activeElement !== budgetInput) {
        budgetInput.value = state.budget || '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentMonth').textContent = new Date().toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    document.getElementById('budgetForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = document.getElementById('budgetAmount').value;
        setBudget(amount);
    });

    document.getElementById('expenseForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const desc = document.getElementById('expenseDesc').value;
        const amount = document.getElementById('expenseAmount').value;
        const category = document.getElementById('expenseCategory').value;

        addExpense(desc, amount, category);
        e.target.reset();
        document.getElementById('expenseDesc').focus();
    });

    document.getElementById('expenseList').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-delete]');
        if (btn) deleteExpense(btn.dataset.delete);
    });

    render();
});
