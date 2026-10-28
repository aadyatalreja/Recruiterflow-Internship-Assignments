import { expect, test } from '@playwright/test'

const apiKey = process.env.REQRES_API_KEY

test.use({
  baseURL: 'https://reqres.in',
  extraHTTPHeaders: { 'x-api-key': apiKey ?? '' },
})

test.beforeAll(() => {
  expect(apiKey, 'Set REQRES_API_KEY in qa/.env (copy .env.example)').toBeTruthy()
})

test('GET /api/users/2 returns the user with an email', async ({ request }) => {
  const response = await request.get('/api/users/2')

  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.data.email).toEqual(expect.any(String))
  expect(body.data.email).not.toBe('')
})

test('GET /api/users/23 returns 404 for a user that does not exist', async ({ request }) => {
  const response = await request.get('/api/users/23')

  expect(response.status()).toBe(404)
})

test('POST /api/users creates a user named morpheus', async ({ request }) => {
  const response = await request.post('/api/users', {
    data: { name: 'morpheus', job: 'leader' },
  })

  expect(response.status()).toBe(201)
  const body = await response.json()
  expect(body.name).toBe('morpheus')
})
