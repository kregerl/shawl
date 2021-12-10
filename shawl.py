#! /usr/bin/env python3
import shodan
import time
from datetime import date

# Input API key
with open("api.txt", "r") as apikey:
    SHODAN_API_KEY = apikey.readline()
api = shodan.Shodan(SHODAN_API_KEY)
MAX_PAGE_NUMBER = 1000
WORKERS = 4

# Query Shodan
def request_page_from_shodan(query, page=1):
    while True:
        try:
            instances = api.search(query, page=page)
            return instances
        except shodan.APIError as e:
            print(f"Error: {e}")
            time.sleep(5)

# searches on shodan using the given query, and iterates over each page of the results
def process_page(page):
    print(len(page['matches']))
    for match in page['matches']:
        with open("ip_str_ll_" + str(date.today()) + ".csv", "a") as file:
            file.writelines(f"{match['ip_str']}, {match['location']['longitude']}, {match['location']['latitude']},\n")

def query_shodan(query, pages):
	print(query)
	print(int(pages[0]))
	for i in range(int(pages[0]), int(pages[1])):
		print("[*] querying page " + str(i))
		first_page = request_page_from_shodan(query[0], i)
		process_page(first_page)

def multithread(query):
	threads = []
	pages_per_worker = MAX_PAGE_NUMBER / WORKERS 
	with ThreadPoolExecutor(max_workers=WORKERS) as executor:
		for i in range(1, WORKERS + 1):
			start = (i - 1) * pages_per_worker
			start = 1 if start == 0 else start
			end = i * pages_per_worker
			executor.submit(query_shodan, query, (start, end))

# search for minecraft 1.18 servers
if __name__ == "__main__":
	multithread('minecraft 1.18')
    #query_shodan('minecraft 1.18')

