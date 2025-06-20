import requests
import sys
import json
import random
import string
from datetime import datetime

class DrivingSchoolAPITester:
    def __init__(self, base_url="https://e0890b28-e7c6-4b8b-bb87-56e993a29411.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None, form_data=False):
        """Run a single API test"""
        # Handle special case for endpoints that don't have /api prefix
        if endpoint.startswith("../"):
            url = f"{self.base_url}/{endpoint[3:]}"
        else:
            url = f"{self.base_url}/api/{endpoint}"
        
        if headers is None:
            headers = {}
            
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if not files and not form_data and 'Content-Type' not in headers:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers)
                elif form_data:
                    response = requests.post(url, data=data, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            
            # Try to parse response as JSON
            response_data = {}
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text[:200] + "..." if len(response.text) > 200 else response.text}
            
            result = {
                "name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response": response_data
            }
            
            self.test_results.append(result)
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}...")

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test the health check endpoint"""
        # Health check doesn't have /api prefix
        return self.run_test(
            "Health Check",
            "GET",
            "../health",  # Go up one level to remove /api prefix
            200
        )

    def test_get_states(self):
        """Test getting the list of states"""
        return self.run_test(
            "Get States",
            "GET",
            "states",
            200
        )

    def test_register_user(self):
        """Test user registration"""
        # Generate random user data
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        email = f"test_user_{random_suffix}@example.com"
        
        # Create form data
        form_data = {
            "email": email,
            "password": "Test123!",
            "first_name": "Test",
            "last_name": "User",
            "phone": "+213123456789",
            "address": "123 Test Street",
            "date_of_birth": "1990-01-01",
            "gender": "male",
            "state": "Alger"
        }
        
        success, response = self.run_test(
            "Register User",
            "POST",
            "auth/register",
            200,
            data=form_data,
            form_data=True
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user = response['user']
            return True, response
        return False, response

    def test_login(self, email="test@example.com", password="Test123!"):
        """Test login with existing credentials"""
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user = response['user']
            return True, response
        return False, response

    def test_get_current_user(self):
        """Test getting current user info"""
        return self.run_test(
            "Get Current User",
            "GET",
            "users/me",
            200
        )

    def test_get_dashboard(self):
        """Test getting dashboard data"""
        return self.run_test(
            "Get Dashboard",
            "GET",
            "dashboard",
            200
        )

    def test_get_driving_schools(self):
        """Test getting list of driving schools"""
        return self.run_test(
            "Get Driving Schools",
            "GET",
            "driving-schools",
            200
        )

    def test_get_driving_schools_with_filters(self):
        """Test getting driving schools with filters"""
        return self.run_test(
            "Get Driving Schools with Filters",
            "GET",
            "driving-schools?state=Alger&min_price=10000&max_price=50000&sort_by=price&sort_order=asc",
            200
        )

    def test_get_documents(self):
        """Test getting user documents"""
        return self.run_test(
            "Get User Documents",
            "GET",
            "documents",
            200
        )

    def test_get_notifications(self):
        """Test getting user notifications"""
        return self.run_test(
            "Get User Notifications",
            "GET",
            "notifications",
            200
        )

    def test_get_courses(self):
        """Test getting user courses"""
        return self.run_test(
            "Get User Courses",
            "GET",
            "courses",
            200
        )

    def test_enroll_in_school(self, school_id=None):
        """Test enrolling in a driving school"""
        if not school_id:
            # First get available schools
            success, schools_response = self.test_get_driving_schools()
            if success and 'schools' in schools_response and len(schools_response['schools']) > 0:
                school_id = schools_response['schools'][0]['id']
            else:
                print("❌ No schools available for enrollment test")
                return False, {}
        
        return self.run_test(
            "Enroll in School",
            "POST",
            "enroll",
            200,
            data={"school_id": school_id}
        )

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print(f"📊 API TEST SUMMARY: {self.tests_passed}/{self.tests_run} tests passed")
        print("="*50)
        
        # Group by success/failure
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['name']} ({test['method']} {test['endpoint']})")
                print(f"    Expected: {test['expected_status']}, Got: {test.get('actual_status', 'Error')}")
                if 'error' in test:
                    print(f"    Error: {test['error']}")
                elif 'response' in test:
                    print(f"    Response: {json.dumps(test['response'], indent=2)[:200]}...")
        
        return self.tests_passed == self.tests_run

def main():
    # Get base URL from command line if provided
    base_url = "https://e0890b28-e7c6-4b8b-bb87-56e993a29411.preview.emergentagent.com"
    
    # Setup tester
    tester = DrivingSchoolAPITester(base_url)
    
    # Run tests without authentication
    tester.test_health_check()
    tester.test_get_states()
    tester.test_get_driving_schools()
    tester.test_get_driving_schools_with_filters()
    
    # Test registration and login
    register_success, register_data = tester.test_register_user()
    
    if not register_success:
        # Try login with default credentials
        login_success, login_data = tester.test_login()
        if not login_success:
            print("❌ Both registration and login failed, cannot proceed with authenticated tests")
            tester.print_summary()
            return 1
    
    # Run tests that require authentication
    tester.test_get_current_user()
    tester.test_get_dashboard()
    tester.test_get_documents()
    tester.test_get_notifications()
    tester.test_get_courses()
    
    # Test enrollment if user is not already enrolled
    if tester.user and tester.user.get('role') in ['guest', 'student']:
        tester.test_enroll_in_school()
    
    # Print summary
    all_passed = tester.print_summary()
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())